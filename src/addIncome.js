const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { add, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval } = require('date-fns');
const { verifyToken } = require('./tokenUtils');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
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

const calculateOccurrences = (startDate, frequency) => {
  let occurrences = [];
  const endDate = add(startDate, { years: 1 });

  switch (frequency) {
    case "once":
      occurrences.push(startDate);
      break;
    case "weekly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate })
        .filter((date) => date.getDay() === startDate.getDay());
      break;
    case "biweekly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate })
        .filter((date, index) => (index % 14) === 0);
      break;
    case "monthly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate });
      break;
    case "bi-monthly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate })
        .filter((date, index) => (index % 60) === 0);
      break;
    case "quarterly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate })
        .filter((date, index) => (index % 3) === 0);
      break;
    case "annually":
      occurrences.push(add(startDate, { years: 1 }));
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return occurrences;
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, refreshToken, householdId, name, amount, firstPayDay, frequency, description, paymentSourceId, tags } = body;

    if (!authorizationToken || !refreshToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

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
        headers: corsHeaders,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    const paymentSourceExists = await prisma.paymentSource.findUnique({
      where: { sourceId: paymentSourceId },
    });

    if (!paymentSourceExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" }),
      };
    }

    const newIncome = await prisma.incomes.create({
      data: {
        incomeId: uuidv4(),
        householdId: householdId,
        name: name,
        amount: parseFloat(amount),
        frequency: frequency,
        firstPayDay: new Date(firstPayDay),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const occurrences = calculateOccurrences(new Date(firstPayDay), frequency);

    for (const occurrence of occurrences) {
      await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: householdId,
          amount: parseFloat(amount),
          transactionType: "Credit",
          transactionDate: occurrence,
          category: 'Income',
          description: `${name} - ${description}`,
          status: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: updatedBy,
          incomeId: newIncome.incomeId,
          paymentSourceId: paymentSourceId,
          runningTotal: 0, // Initial placeholder
          tags: tags || `Income,${name}`, 
        },
      });
    }

    // Invoke the secondary Lambda function to calculate running totals for the payment source
    const calculateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: householdId, paymentSourceId: paymentSourceId }),
    });

    await lambdaClient.send(calculateTotalsCommand);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Income and ledger entries added successfully",
        income: newIncome,
      }),
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
