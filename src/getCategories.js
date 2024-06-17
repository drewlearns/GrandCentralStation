const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
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

exports.handler = async (event) => {
  const { authorizationToken, refreshToken, householdId, month, year } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token or refresh token provided.'
      })
    };
  }

  if (!householdId || !month || !year) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Missing householdId, month or year parameter" }),
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
        body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
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
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const yearStartDate = new Date(year, 0, 1);

    const monthTransactions = await prisma.ledger.groupBy({
      by: ['category'],
      where: {
        householdId: householdId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    const yearToDateTransactions = await prisma.ledger.groupBy({
      by: ['category'],
      where: {
        householdId: householdId,
        transactionDate: {
          gte: yearStartDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    const monthSpend = monthTransactions.map(transaction => ({
      category: transaction.category,
      amount: new Decimal(transaction._sum.amount).toFixed(2)
    }));

    const yearToDateSpend = yearToDateTransactions.map(transaction => ({
      category: transaction.category,
      amount: new Decimal(transaction._sum.amount).toFixed(2)
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ monthSpend, yearToDateSpend }),
    };
  } catch (error) {
    console.error('Error retrieving categories:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error retrieving categories", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
