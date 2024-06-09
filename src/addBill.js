const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { SecretsManagerClient, CreateSecretCommand } = require("@aws-sdk/client-secrets-manager");
const { add, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, isValid, set, getDate, setDate } = require("date-fns");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const calculateOccurrences = (startDate, frequency, dayOfMonth) => {
  let occurrences = [];
  const endDate = add(startDate, { months: 12 });

  const adjustDayOfMonth = (date, dayOfMonth) => {
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return setDate(date, Math.min(dayOfMonth, lastDayOfMonth));
  };

  switch (frequency) {
    case "once":
      occurrences.push(adjustDayOfMonth(startDate, dayOfMonth));
      break;
    case "weekly":
      occurrences = eachWeekOfInterval({ start: startDate, end: endDate }).map(date => adjustDayOfMonth(date, dayOfMonth));
      break;
    case "biweekly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 14 === 0
      ).map(date => adjustDayOfMonth(date, dayOfMonth));
      break;
    case "monthly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate }).map(date => adjustDayOfMonth(date, dayOfMonth));
      break;
    case "bi-monthly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 60 === 0
      ).map(date => adjustDayOfMonth(date, dayOfMonth));
      break;
    case "quarterly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 3 === 0
      ).map(date => adjustDayOfMonth(date, dayOfMonth));
      break;
    case "annually":
      occurrences.push(adjustDayOfMonth(add(startDate, { years: 1 }), dayOfMonth));
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return occurrences;
};

const storeCredentialsInSecretsManager = async (username, password) => {
  const secretName = `bill-credentials/${uuidv4()}`;
  const secretValue = JSON.stringify({ username, password });

  const command = new CreateSecretCommand({
    Name: secretName,
    SecretString: secretValue,
  });

  const response = await secretsManagerClient.send(command);
  return response.ARN;
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const requiredFields = [
      'authorizationToken',
      'householdId',
      'paymentSourceId',
      'billName',
      'dayOfMonth',
      'frequency',
      'username',
      'password',
      'amount',
      'category',
    ];

    // Validate required fields
    for (const field of requiredFields) {
      if (!body[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `${field} is required` })
        };
      }
    }

    const { authorizationToken, householdId, paymentSourceId, billName, dayOfMonth, frequency, username, password, tags, description, amount, category, interestRate, cashBack, isDebt, status, url } = body;

    console.log("Received householdId:", householdId); // Debugging line

    let updatedBy;

    try {
      const verifyTokenCommand = new InvokeCommand({
        FunctionName: 'verifyToken',
        Payload: JSON.stringify({ authorizationToken })
      });

      const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
      const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

      if (verifyTokenResponse.FunctionError) {
        throw new Error(payload.errorMessage || 'Token verification failed.');
      }

      updatedBy = payload.username;
      if (!updatedBy) {
        throw new Error('Token verification did not return a valid username.');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token.', error: error.message })
      };
    }

    const householdExists = await prisma.household.findUnique({
      where: { householdId: householdId },
    });

    if (!householdExists) {
      console.log(`Error: Household ${householdId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Household not found" })
      };
    }

    const paymentSourceExists = await prisma.paymentSource.findUnique({
      where: { sourceId: paymentSourceId },
    });

    if (!paymentSourceExists) {
      console.log(`Error: Payment source ${paymentSourceId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" })
      };
    }

    let credentialsArn;
    try {
      credentialsArn = await storeCredentialsInSecretsManager(username, password);
    } catch (error) {
      console.error('Error storing credentials in Secrets Manager:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error storing credentials", error: error.message })
      };
    }

    let newBill;
    try {
      newBill = await prisma.bill.create({
        data: {
          billId: uuidv4(),
          category: category,
          billName: billName,
          amount: parseFloat(amount),
          dayOfMonth: parseInt(dayOfMonth),
          frequency: frequency,
          isDebt: isDebt === "true",
          interestRate: interestRate ? parseFloat(interestRate) : 0.0, // Set default value
          cashBack: cashBack ? parseFloat(cashBack) : 0.0,
          description: description,
          status: status === "true", // Ensure status is Boolean
          url: url,
          username: credentialsArn,
          password: credentialsArn,
          createdAt: new Date(),
          updatedAt: new Date(),
          household: {
            connect: { householdId: householdId }
          }
        },
      });
    } catch (error) {
      console.error('Error creating bill:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error creating bill", error: error.message })
      };
    }

    // Calculate the first valid date based on the day of the month provided
    let firstBillDate = setDate(new Date(), parseInt(dayOfMonth));

    // Ensure the date is valid
    if (!isValid(firstBillDate)) {
      console.error('Invalid date value:', firstBillDate);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid date value" })
      };
    }

    const occurrences = calculateOccurrences(firstBillDate, frequency, parseInt(dayOfMonth));

    for (const occurrence of occurrences) {
      await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: householdId,
          amount: parseFloat(amount),
          transactionType: "debit",
          transactionDate: occurrence,
          category: category,
          description: `${billName} - ${description}`,
          status: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: updatedBy,
          billId: newBill.billId,
          paymentSourceId: paymentSourceId,
          runningTotal: 0,
          interestRate: interestRate ? parseFloat(interestRate) : null,
          cashBack: cashBack ? parseFloat(cashBack) : null,
          tags: tags || null,
        },
      });
    }

    const householdMembers = await prisma.householdMembers.findMany({
      where: { householdId: householdId },
      include: { member: { select: { email: true } } },
    });

    const recipientEmails = householdMembers.map(member => member.member.email).join(';');

    const addNotificationCommand = new InvokeCommand({
      FunctionName: 'addNotification',
      Payload: JSON.stringify({
        authorizationToken: authorizationToken,
        billId: newBill.billId,
        title: `Bill Due: ${billName}`,
        message: `Your bill for ${billName} is due on ${firstBillDate.toISOString().split('T')[0]}.`,
        recipientEmail: recipientEmails,
      }),
    });

    await lambdaClient.send(addNotificationCommand);

    console.log(`Success: Bill and ledger entries added for household ${householdId}`);
    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Bill and ledger entries added successfully", bill: newBill })
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, { errorDetails: error });

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request", error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
