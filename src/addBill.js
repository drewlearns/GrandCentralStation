const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SecretsManagerClient, CreateSecretCommand } = require('@aws-sdk/client-secrets-manager');
const { add, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, isValid, setDate } = require('date-fns');
const { verifyToken } = require('./tokenUtils');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const refreshAndVerifyToken = async (authorizationToken, refreshToken) => {
  try {
    // Try to refresh the token
    const refreshTokenCommand = new InvokeCommand({
      FunctionName: 'refreshToken',
      Payload: JSON.stringify({ authorizationToken, refreshToken }),
    });

    const refreshTokenResponse = await lambdaClient.send(refreshTokenCommand);
    const refreshTokenPayload = JSON.parse(new TextDecoder('utf-8').decode(refreshTokenResponse.Payload));

    if (refreshTokenResponse.FunctionError || refreshTokenPayload.statusCode !== 200) {
      throw new Error(refreshTokenPayload.message || 'Token refresh failed.');
    }

    const newToken = JSON.parse(refreshTokenPayload.body).newToken;

    // Verify the new token
    const userId = await verifyToken(newToken);

    return { userId, newToken };
  } catch (error) {
    console.error('Token refresh and verification failed:', error);
    throw new Error('Invalid token.');
  }
};

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
      'refreshToken',
      'householdId',
      'paymentSourceId',
      'billName',
      'dayOfMonth',
      'frequency',
      'amount',
      'category',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `${field} is required` }),
          headers: corsHeaders
        };
      }
    }

    const { authorizationToken, refreshToken, householdId, paymentSourceId, billName, dayOfMonth, frequency, username, password, tags, description, amount, category, interestRate, cashBack, isDebt, status, url } = body;

    let updatedBy;
    let tokenValid = false;

    // First attempt to verify the token
    try {
      updatedBy = await verifyToken(authorizationToken);
      tokenValid = true;
    } catch (error) {
      console.error('Token verification failed, attempting refresh:', error.message);

      // Attempt to refresh the token and verify again
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      updatedBy = result.userId;
      authorizationToken = result.newToken; // Update authorizationToken with new token
      tokenValid = true;
    }

    if (!tokenValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.' }),
      };
    }

    const householdExists = await prisma.household.findUnique({
      where: { householdId: householdId },
    });

    if (!householdExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Household not found" }),
        headers: corsHeaders
      };
    }

    const paymentSourceExists = await prisma.paymentSource.findUnique({
      where: { sourceId: paymentSourceId },
    });

    if (!paymentSourceExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" }),
        headers: corsHeaders
      };
    }

    let credentialsArn = null;
    if (username && password) {
      try {
        credentialsArn = await storeCredentialsInSecretsManager(username, password);
      } catch (error) {
        console.error('Error storing credentials in Secrets Manager:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Error storing credentials", error: error.message }),
          headers: corsHeaders
        };
      }
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
          interestRate: interestRate ? parseFloat(interestRate) : 0.0,
          cashBack: cashBack ? parseFloat(cashBack) : 0.0,
          description: description,
          status: false,
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
        body: JSON.stringify({ message: "Error creating bill", error: error.message }),
        headers: corsHeaders
      };
    }

    let firstBillDate = setDate(new Date(), parseInt(dayOfMonth));
    if (!isValid(firstBillDate)) {
      console.error('Invalid date value:', firstBillDate);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid date value" }),
        headers: corsHeaders
      };
    }

    const occurrences = calculateOccurrences(firstBillDate, frequency, parseInt(dayOfMonth));

    for (const occurrence of occurrences) {
      await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: householdId,
          amount: parseFloat(amount),
          transactionType: "Debit",
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

      await prisma.notification.create({
        data: {
          notificationId: uuidv4(),
          userUuid: updatedBy,
          billId: newBill.billId,
          title: `Bill Due: ${billName}`,
          message: `Your bill for ${billName} is due on ${occurrence.toISOString().split('T')[0]}.`,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: occurrence, // Set the dueDate
        },
      });
    }

    // Invoke calculateRunningTotal Lambda function
    const updateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId, paymentSourceId }),
    });

    await lambdaClient.send(updateTotalsCommand);

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
        message: `Your bill for ${billName} is due on the ${firstBillDate.toISOString().split('T')[0]}.`,
        recipientEmail: recipientEmails,
      }),
    });

    await lambdaClient.send(addNotificationCommand);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Bill and ledger entries added successfully", bill: newBill })
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, { errorDetails: error });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error processing request", error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
