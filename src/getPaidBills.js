// paidBills.js

const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfMonth, endOfToday } = require('date-fns');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

async function getPaidBills(event) {
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
    // Get the start of the current month and the end of today
    const startDate = startOfMonth(new Date());
    const endDate = endOfToday(new Date());

    // Fetch bills from the ledger where the status is true, due date is within the current month, and sort them in descending order based on the due date
    const paidBills = await prisma.bill.findMany({
      where: {
        status: true,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        dueDate: 'desc'
      },
      include: {
        ledger: true // Assuming there is a relation to ledger in your Bill model
      }
    });

    // Transform the data to include necessary fields
    const paidBillsList = paidBills.map(bill => ({
      billName: bill.name,
      paymentSourceId: bill.paymentSourceId,
      paymentSourceName: bill.paymentSource.name,
      dueDate: bill.dueDate,
      amountPaid: bill.amount,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Paid bills for the current month retrieved successfully',
        paidBills: paidBillsList,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error fetching paid bills:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve paid bills',
        errorDetails: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
}

exports.handler = async (event) => {
  return await getPaidBills(event);
};
