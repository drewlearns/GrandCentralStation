const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { startOfMonth, endOfMonth } = require('date-fns');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, householdId } = body;

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
        headers: { 'Content-Type': 'application/json' },
      };
    }

    if (!householdId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing householdId parameter" }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const startDate = startOfMonth(new Date());
    const endDate = endOfMonth(new Date());

    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    // Verify the householdId
    const householdExists = await prisma.household.findUnique({
      where: { householdId },
    });

    if (!householdExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Household not found" }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Add more detailed logging for debugging
    console.log(`Fetching ledger entries for householdId: ${householdId} between ${startDate} and ${endDate}`);

    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        incomeId: { not: null },
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    console.log('Ledger Entries:', ledgerEntries);

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No income entries found for the current month" }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const totalIncome = ledgerEntries.reduce((total, entry) => total + entry.amount, 0);

    // Assuming you have logic to calculate safeToSpend and nextPayday
    const safeToSpend = 1631.54; // Placeholder value, replace with actual calculation
    const nextPayday = new Date('2024-06-23T01:45:26.426Z'); // Placeholder value, replace with actual calculation

    return {
      statusCode: 200,
      body: JSON.stringify({
        totalIncome: totalIncome.toFixed(2),
        safeToSpend: safeToSpend.toFixed(2),
        nextPayday: nextPayday.toISOString()
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error calculating current month income:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error calculating current month income", error: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
};
