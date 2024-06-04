// pastDueBills.js

const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

async function getPastDueBills(event) {
  const { authorizationToken } = JSON.parse(event.body);

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

  try {
    // Get the current date
    const currentDate = new Date();

    // Fetch bills from the ledger where the status is not true and the date is past
    const pastDueBills = await prisma.bill.findMany({
      where: {
        status: false,
        dueDate: {
          lt: currentDate
        }
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Past due bills retrieved successfully',
        pastDueBills: pastDueBills
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error fetching past due bills:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve past due bills',
        errorDetails: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getPastDueBills(event);
};
