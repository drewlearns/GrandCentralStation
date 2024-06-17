const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
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
          }),
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
        body: JSON.stringify({ message: "Missing householdId parameter" }),
      };
    }

    await prisma.$connect();

    // Get the current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const incomes = await prisma.incomes.findMany({
      where: { householdId: householdId },
      include: {
        ledgers: {
          where: {
            transactionDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        },
      },
    });

    if (incomes.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No incomes found for the given householdId" }),
      };
    }

    // Flatten the structure to top-level array and filter by current month
    const ledgerEntries = incomes.flatMap(income =>
      income.ledgers.map(ledger => ({
        incomeId: income.incomeId,
        name: income.name,
        amount: ledger.amount,
        payday: ledger.transactionDate,
      }))
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ incomes: ledgerEntries }),
    };
  } catch (error) {
    console.error('Error retrieving incomes:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error retrieving incomes", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
