const { PrismaClient } = require('@prisma/client');
const { InvokeCommand, LambdaClient } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const lambda = new LambdaClient();

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
      headers: corsHeaders,
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { authorizationToken } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Access denied. No token provided.' })
      };
    }

    // Verify the token and get the decoded token
    const decodedToken = await verifyToken(authorizationToken);
    const userUuid = decodedToken.uid; // Assuming the token contains a field 'uid' for the user's UUID

    // Validate that the user exists
    const user = await prisma.user.findUnique({ where: { uuid: userUuid } });
    if (!user) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "User not found" }) };

    // Delete the user and related data
    await prisma.user.delete({ where: { uuid: userUuid } });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "User deleted successfully" })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error processing request", error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
