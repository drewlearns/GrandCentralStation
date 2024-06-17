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
  let authorizationToken, refreshToken, paymentSourceId;

  try {
    const parsedBody = JSON.parse(event.body);
    authorizationToken = parsedBody.authorizationToken;
    refreshToken = parsedBody.refreshToken;
    paymentSourceId = parsedBody.paymentSourceId;
  } catch (error) {
    console.error('Error parsing event body:', error);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid request body format',
        error: error.message,
      }),
    };
  }

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token or refresh token provided.',
      }),
    };
  }

  if (!paymentSourceId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Missing paymentSourceId in the request',
      }),
    };
  }

  let updatedBy;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    updatedBy = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      updatedBy = result.userId;
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
    // Fetch the latest ledger entry for the given payment source up to the current date and time
    const now = new Date();

    const latestLedgerEntry = await prisma.ledger.findFirst({
      where: {
        paymentSourceId: paymentSourceId,
        transactionDate: {
          lte: now,
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
      select: {
        runningTotal: true,
        transactionDate: true,
      },
    });

    if (!latestLedgerEntry) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'No ledger entries found for the given payment source',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        paymentSourceId: paymentSourceId,
        runningTotal: latestLedgerEntry.runningTotal,
      }),
    };
  } catch (error) {
    console.error(`Error fetching running total: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Error fetching running total',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
