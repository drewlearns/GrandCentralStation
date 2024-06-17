const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfMonth, endOfToday } = require('date-fns');
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function getTotalMonthlyIncome(event) {
  const { authorizationToken, refreshToken } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token or refresh token provided.'
      }),
      headers: corsHeaders,
    };
  }

  let username;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    username = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      username = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Invalid token.',
          error: refreshError.message,
        }),
      };
    }
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.' }),
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
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Total income retrieved successfully',
        totalIncome: totalIncome.toFixed(2)
      }),
    };
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Failed to retrieve total income',
        errorDetails: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getTotalMonthlyIncome(event);
};
