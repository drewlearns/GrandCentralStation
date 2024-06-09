const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfMonth, endOfToday } = require('date-fns');
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

async function getTotalSpent(event) {
  const { authorizationToken, householdId } = JSON.parse(event.body);

  // Log incoming data
  console.log('Authorization Token:', authorizationToken);
  console.log('Household ID:', householdId);

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

  if (!householdId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Household ID is required.',
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    // Get the start of the current month and the end of today
    const startDate = startOfMonth(new Date());
    const endDate = endOfToday(new Date());

    console.log(`Querying transactions between ${startDate} and ${endDate} for householdId ${householdId}`);

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
        }
      }
    });

    // Log the fetched transactions
    console.log('Fetched Transactions:', transactions);

    if (transactions.length === 0) {
      console.log('No transactions found for the given date range and householdId.');
    }

    // Sum the amounts of the fetched transactions
    const totalSpent = transactions.reduce((sum, transaction) => sum.plus(new Decimal(transaction.amount)), new Decimal(0));

    // Format totalSpent as a string with two decimal places
    const formattedTotalSpent = totalSpent.toFixed(2);

    console.log('Total Spent:', formattedTotalSpent);

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
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve total spent',
        errorDetails: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getTotalSpent(event);
};
