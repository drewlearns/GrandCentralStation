const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { startOfMonth, endOfMonth } = require('date-fns');
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

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, refreshToken, householdId } = body;

    if (!authorizationToken || !refreshToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token or refresh token provided.'
        })
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
          headers: corsHeaders,
          body: JSON.stringify({
            message: 'Invalid token.',
            error: refreshError.message,
          })
        };
      }
    }

    if (!tokenValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.' }),
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
        totalIncome: totalIncome,
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
