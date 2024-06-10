const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { startOfMonth, endOfMonth } = require('date-fns');
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, householdId } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
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
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Invalid token.',
          error: error.message,
        })
      };
    }

    if (!householdId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing householdId parameter" })
      };
    }

    const startDate = startOfMonth(new Date());
    const endDate = endOfMonth(new Date());

    // Verify the householdId
    const householdExists = await prisma.household.findUnique({
      where: { householdId },
    });

    if (!householdExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Household not found" })
      };
    }

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

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No income entries found for the current month" }),
        headers: corsHeaders,
      };
    }

    const totalIncome = ledgerEntries.reduce((total, entry) => total + entry.amount, 0);

    // Determine next payday
    const today = new Date();
    const nextLedgerEntryWithIncome = await prisma.ledger.findFirst({
      where: {
        householdId: householdId,
        incomeId: { not: null },
        transactionDate: { gt: today },
      },
      orderBy: { transactionDate: 'asc' },
    });

    let nextPayday = nextLedgerEntryWithIncome ? nextLedgerEntryWithIncome.transactionDate : null;

    if (!nextPayday) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Could not determine the next payday." }),
        headers: corsHeaders,
      };
    }

    // Fetch ledger entries up to the next payday
    const upcomingLedgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        transactionDate: {
          gte: today,
          lte: nextPayday,
        },
      },
      orderBy: [
        { transactionDate: 'asc' },
        { createdAt: 'asc' } // Ensure the entries are ordered by both date and creation time
      ],
    });

    const lowestRunningTotal = upcomingLedgerEntries.reduce((lowest, entry) => {
      const runningTotal = new Decimal(entry.runningTotal);
      return runningTotal.lessThan(lowest) ? runningTotal : lowest;
    }, new Decimal(upcomingLedgerEntries[0].runningTotal));

    const safeToSpend = lowestRunningTotal.toNumber();

    return {
      statusCode: 200,
      body: JSON.stringify({
        totalIncome: totalIncome.toFixed(2),
        safeToSpend: safeToSpend.toFixed(2),
        nextPayday: nextPayday.toISOString()
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error('Error calculating current month income:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error calculating current month income", error: error.message }),
      headers: corsHeaders,
    };
  } finally {
    await prisma.$disconnect();
  }
};
