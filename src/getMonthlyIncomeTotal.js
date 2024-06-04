// getTotalMonthlyIncome.js

const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfMonth, endOfToday } = require('date-fns');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

async function getTotalMonthlyIncome(event) {
  const { authorizationToken } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken }),
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    username = payload.username;
    if (!username) {
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
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    // Get the start of the current month and the end of today
    const startDate = startOfMonth(new Date());
    const endDate = endOfToday(new Date());

    // Fetch incomes within the date range
    const incomes = await prisma.income.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Sum the amounts of the fetched incomes
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Total income retrieved successfully',
        totalIncome: totalIncome.toFixed(2)
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve total income',
        errorDetails: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getTotalMonthlyIncome(event);
};
