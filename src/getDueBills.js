const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfToday, endOfToday } = require('date-fns');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function getDueBills(event) {
  const { authorizationToken } = JSON.parse(event.body);

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
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
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
