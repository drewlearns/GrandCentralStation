const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfToday } = require('date-fns');
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

async function getFutureDueBills(event) {
  const { authorizationToken, refreshToken, householdId } = JSON.parse(event.body);

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
        body: JSON.stringify({
          message: 'Invalid token.',
          error: refreshError.message,
        }),
        headers: corsHeaders,
      };
    }
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token.' }),
      headers: corsHeaders,
    };
  }

  if (!householdId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'householdId is required.'
      }),
      headers: corsHeaders,
    };
  }

  try {
    const startDate = startOfToday();

    const queryConditions = {
      householdId,
      billId: { not: null }, // Ensure billId is present
      status: false, // Only future due bills
      transactionDate: { gt: startDate } // Due after today
    };

    const bills = await prisma.ledger.findMany({
      where: queryConditions,
      include: {
        bill: {
          include: {
            household: {
              include: {
                paymentSources: true
              }
            }
          }
        }
      }
    });

    // Helper function to format numbers with two decimal places
    const formatNumber = (num) => Number(new Decimal(num).toFixed(2));

    const billsList = bills.map(ledger => {
      const bill = ledger.bill;
      const household = bill.household;
      const paymentSource = household.paymentSources.find(ps => ps.sourceId === ledger.paymentSourceId);

      return {
        billId: bill.billId, // Include billId in the response
        billName: bill.billName,
        paymentSourceId: ledger.paymentSourceId,
        paymentSourceName: paymentSource ? paymentSource.sourceName : null,
        dueDate: ledger.transactionDate,
        amount: formatNumber(ledger.amount),
        status: ledger.status,
      };
    });

    // Convert to JSON manually to ensure numbers maintain .00
    const jsonString = JSON.stringify({ bills: billsList }, (key, value) => {
      if (typeof value === 'number') {
        return Number(value).toFixed(2);
      }
      return value;
    });

    // Replace the .00 quotes to maintain them as numbers
    const formattedJsonString = jsonString.replace(/"(-?\d+\.\d{2})"/g, '$1');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: formattedJsonString,
    };
  } catch (error) {
    console.error('Error fetching bills:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Failed to retrieve bills',
        errorDetails: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getFutureDueBills(event);
};
