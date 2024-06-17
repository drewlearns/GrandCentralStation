const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfToday, endOfToday } = require('date-fns');
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

async function getDueBills(event) {
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

  try {
    const startDate = startOfToday();
    const endDate = endOfToday();

    const dueBills = await prisma.ledger.findMany({
      where: {
        status: false, // Check the status of the ledger entry
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
      },
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

    const dueBillsList = dueBills.map(ledger => {
      const paymentSource = ledger.bill.household.paymentSources.find(ps => ps.sourceId === ledger.paymentSourceId);
      return {
        billId: ledger.bill.billId, // Include billId in the response
        billName: ledger.bill.billName,
        paymentSourceId: ledger.paymentSourceId,
        paymentSourceName: paymentSource ? paymentSource.sourceName : null,
        dueDate: ledger.transactionDate,
        amountDue: ledger.amount,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Today due bills retrieved successfully',
        dueBills: dueBillsList,
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error('Error fetching today due bills:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve today due bills',
        errorDetails: error.message,
      }),
      headers: corsHeaders,
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getDueBills(event);
};
