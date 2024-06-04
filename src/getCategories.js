const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId, month, year } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }
  
  if (!householdId || !month || !year) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing householdId, month or year parameter" }),
    };
  }

  let username;
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
      amount: transaction._sum.amount
    }));

    const yearToDateSpend = yearToDateTransactions.map(transaction => ({
      category: transaction.category,
      amount: transaction._sum.amount
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ monthSpend, yearToDateSpend }),
    };
  } catch (error) {
    console.error('Error retrieving categories:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving categories", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
