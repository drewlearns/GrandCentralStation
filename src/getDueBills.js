// todayDueBills.js

const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfToday } = require('date-fns');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

async function getTodayAndFutureDueBills(event) {
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
    // Get the start of today
    const startDate = startOfToday();

    // Fetch bills from the ledger where the status is not true and the due date is today or in the future
    const dueBills = await prisma.bill.findMany({
      where: {
        status: false,
        dueDate: {
          gte: startDate,
        },
      },
      include: {
        paymentSource: true, // Assuming you have a relation to paymentSource in your Bill model
      },
    });

    // Transform the data to include necessary fields
    const dueBillsList = dueBills.map(bill => ({
      billName: bill.name,
      paymentSourceId: bill.paymentSourceId,
      paymentSourceName: bill.paymentSource.name,
      dueDate: bill.dueDate,
      amountDue: bill.amount,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Today and future due bills retrieved successfully',
        dueBills: dueBillsList,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error fetching today and future due bills:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve today and future due bills',
        errorDetails: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getTodayAndFutureDueBills(event);
};
