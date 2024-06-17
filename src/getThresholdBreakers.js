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
  const {
    authorizationToken,
    refreshToken,
    householdId,
    threshold,
    paymentSourceId,
  } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Access denied. No token or refresh token provided." }),
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

  try {
    if (!householdId || !threshold || !paymentSourceId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Missing householdId, threshold, or paymentSourceId parameter",
        }),
      };
    }

    const currentDate = new Date();

    // Fetch ledger entries with running total for the specified paymentSourceId and future transactions only
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        paymentSourceId: paymentSourceId,
        transactionDate: {
          gt: currentDate, // Only fetch transactions that haven't happened yet
        },
        status: false, // Only include entries where status is false
      },
      orderBy: { transactionDate: "asc" },
      select: {
        transactionDate: true,
        amount: true,
        runningTotal: true,
        description: true,  // Fetching description directly from the Ledger table
      },
    });

    const entriesBelowThreshold = ledgerEntries.filter(
      (entry) => entry.runningTotal < threshold
    ).map(entry => ({
      transactionDate: entry.transactionDate,
      amount: entry.amount,
      runningTotal: entry.runningTotal,
      description: entry.description,
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ entries: entriesBelowThreshold }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
