const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken', // Replace with your actual Lambda function name
    Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
  };

  const command = new InvokeCommand(params);
  const response = await lambda.send(command);

  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  console.log("verifyToken response payload:", payload);

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

  const { authToken } = JSON.parse(event.body);

  if (!authToken) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Access denied. No authorization token provided." }),
    };
  }

  let userId;

  // Verify the token
  try {
    const nestedPayload = await verifyToken(authToken);
    userId = nestedPayload.user_id;
    console.log('Verified user_id:', userId);

    if (!userId) {
      throw new Error('User ID is undefined after token verification');
    }
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

  try {
    // Fetch the user details by userId
    const user = await prisma.user.findUnique({
      where: {
        uuid: userId,
      },
    });

    if (!user) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: "User not found",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ user }),
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
