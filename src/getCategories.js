const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, householdId, month, year } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
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
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      headers: corsHeaders,
      Payload: JSON.stringify({ authorizationToken })
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
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
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
