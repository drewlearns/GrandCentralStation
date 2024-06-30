const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { TextEncoder, TextDecoder } = require('util');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken', // Replace with your actual Lambda function name
    Payload: new TextEncoder().encode(JSON.stringify({ token })),
  };

  const command = new InvokeCommand(params);
  const response = await lambda.send(command);

  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  if (payload.errorMessage) {
    throw new Error(payload.errorMessage);
  }

  return payload;
}

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

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.',
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

  let tokenValid = false;

  // Attempt to verify the token
  try {
    const tokenPayload = await verifyToken(authorizationToken);
    updatedBy = tokenPayload.uid;
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
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
