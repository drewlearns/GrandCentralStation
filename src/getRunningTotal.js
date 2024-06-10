const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  let authorizationToken, paymentSourceId;

  try {
    const parsedBody = JSON.parse(event.body);
    authorizationToken = parsedBody.authorizationToken;
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

  try {
    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.',
        }),
      };
    }

    let updatedBy;

    // Verify the token
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

      updatedBy = payload.username;
      if (!updatedBy) {
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
