const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfToday } = require('date-fns');
const Decimal = require('decimal.js');
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

async function getBills(event) {
  const { authorizationToken, pastDueOnly, householdId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
      headers: corsHeaders,
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
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
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
    };

    if (pastDueOnly) {
      queryConditions.status = false; // Only past due bills
      queryConditions.transactionDate = { lt: startDate }; // Due before today
    } else {
      queryConditions.status = true; // Only paid bills
    }

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
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getBills(event);
};
