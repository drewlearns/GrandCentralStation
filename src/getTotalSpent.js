const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfMonth, endOfToday } = require('date-fns');
const Decimal = require('decimal.js');
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

async function getTotalSpent(event) {
  const { authorizationToken, refreshToken, householdId } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token or refresh token provided.'
      }),
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

  if (!householdId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Household ID is required.',
      }),
    };
  }

  try {
    // Get the start of the current month and the end of today
    const startDate = startOfMonth(new Date());
    const endDate = endOfToday(new Date());

    // Fetch transactions of type "Debit" or "debit" within the date range for the specified household
    const transactions = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        transactionType: {
          in: ['Debit', 'debit']
        },
        incomeId: null // Exclude entries with an incomeId
      }
    });

    // Sum the amounts of the fetched transactions
    const totalSpent = transactions.reduce((sum, transaction) => sum.plus(new Decimal(transaction.amount)), new Decimal(0));

    // Format totalSpent as a string with two decimal places
    const formattedTotalSpent = totalSpent.toFixed(2);

    // Construct the response to ensure numbers maintain two decimal places
    const response = {
      message: 'Total spent retrieved successfully',
      totalSpent: formattedTotalSpent
    };

    // Convert to JSON manually to ensure numbers maintain .00
    const jsonString = JSON.stringify(response);

    // Replace the .00 quotes to maintain them as numbers
    const formattedJsonString = jsonString.replace(/"(-?\d+\.\d{2})"/g, '$1');

    return {
      statusCode: 200,
      body: formattedJsonString,
      headers: corsHeaders,
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve total spent',
        errorDetails: error.message,
      }),
      headers: corsHeaders,
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getTotalSpent(event);
};
