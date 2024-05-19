const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { SecretsManagerClient, CreateSecretCommand } = require("@aws-sdk/client-secrets-manager");
const { add, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval } = require("date-fns");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const calculateOccurrences = (startDate, frequency) => {
  let occurrences = [];
  const endDate = add(startDate, { months: 12 });

  switch (frequency) {
    case "once":
      occurrences.push(startDate);
      break;
    case "weekly":
      occurrences = eachWeekOfInterval({ start: startDate, end: endDate });
      break;
    case "biweekly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 14 === 0
      );
      break;
    case "monthly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate });
      break;
    case "bi-monthly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 60 === 0
      );
      break;
    case "quarterly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 3 === 0
      );
      break;
    case "annually":
      occurrences.push(add(startDate, { years: 1 }));
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
    const { authorizationToken, householdId, category, billName, amount, dayOfMonth, frequency, isDebt, interestRate, cashBack, description, status, url, username, password, ipAddress, deviceDetails, paymentSourceId } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

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
        body: JSON.stringify({
          message: 'Invalid token.',
          error: error.message,
        }),
      };
    }

    const householdExists = await prisma.household.findUnique({
      where: { householdId: householdId },
    });

    if (!householdExists) {
      console.log(`Error: Household ${householdId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    const paymentSourceExists = await prisma.paymentSource.findUnique({
      where: { sourceId: paymentSourceId },
    });

    if (!paymentSourceExists) {
      console.log(`Error: Payment source ${paymentSourceId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" }),
      };
    }

    // Store credentials in Secrets Manager and get the ARN
    const credentialsArn = await storeCredentialsInSecretsManager(username, password);

    const newBill = await prisma.bill.create({
      data: {
        billId: uuidv4(),
        householdId: householdId,
        category: category,
        billName: billName,
        amount: parseFloat(amount),
        dayOfMonth: parseInt(dayOfMonth),
        frequency: frequency,
        isDebt: isDebt === "true",
        interestRate: interestRate ? parseFloat(interestRate) : null,
        cashBack: cashBack ? parseFloat(cashBack) : null,
        description: description,
        status: status,
        url: url,
        username: credentialsArn, // Store the ARN of the secret
        password: credentialsArn, // Store the ARN of the secret
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const firstBillDate = new Date();
    firstBillDate.setDate(dayOfMonth);

    const occurrences = calculateOccurrences(firstBillDate, frequency);

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
          status: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: updatedBy,
          billId: newBill.billId,
          paymentSourceId: paymentSourceId,
          runningTotal: 0, // Initial placeholder
          interestRate: interestRate ? parseFloat(interestRate) : null,
          cashBack: cashBack ? parseFloat(cashBack) : null,
        },
      });
    }

    // Invoke the secondary Lambda function to calculate running totals
    const calculateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: householdId, paymentSourceId: paymentSourceId }),
    });

    await lambdaClient.send(calculateTotalsCommand);

    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Bill',
        actionType: 'Create',
        oldValue: '',
        newValue: JSON.stringify(newBill),
        changedBy: updatedBy,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    console.log(`Success: Bill and ledger entries added for household ${householdId}`);
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Bill and ledger entries added successfully",
        bill: newBill,
      }),
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
