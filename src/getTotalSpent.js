const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { TextEncoder, TextDecoder } = require('util');

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
        FunctionName: 'verifyToken', // Ensure this is the correct Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    const nestedPayload = JSON.parse(payload.body);
    console.log("verifyToken nested payload:", nestedPayload);

    return nestedPayload;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
    };
  }

  let eventBody;
  try {
    eventBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Invalid request body" }),
    };
  }

  const authToken = eventBody.authToken;

  if (!authToken) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Access denied. No authorization token provided." }),
    };
  }

  let userId;
  try {
    const tokenPayload = await verifyToken(authToken);
    userId = tokenPayload.user_id; // Assuming the payload includes user_id; adjust as necessary
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

  if (!userId) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid token payload: missing user_id' }),
    };
  }

  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Fetch transactions for the current month with status true and transactionType 'debit' (case-insensitive)
    const transactions = await prisma.ledger.findMany({
      where: {
        householdId: eventBody.householdId,
        status: true,
        transactionType: {
          contains: 'debit',
          mode: 'insensitive',
        },
        transactionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        amount: true,
      },
    });

    const totalSpent = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ totalSpent }),
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
