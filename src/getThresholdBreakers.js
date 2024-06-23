const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary

const CORS_HEADERS = {
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
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
    };
  }

  const { authorizationToken, householdId, threshold, paymentSourceId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Access denied. No authorization token provided." }),
    };
  }

  let uid;

  // Verify the token
  try {
    const payload = await verifyToken(authorizationToken);
    uid = payload.uid;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  if (!uid) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid token payload: missing uid' }),
    };
  }

  if (!householdId || !threshold || !paymentSourceId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Missing householdId, threshold, or paymentSourceId parameter",
      }),
    };
  }

  try {
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
      headers: CORS_HEADERS,
      body: JSON.stringify({ entries: entriesBelowThreshold }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
