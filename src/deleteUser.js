const { PrismaClient } = require('@prisma/client');
const { InvokeCommand, LambdaClient } = require('@aws-sdk/client-lambda');

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
      headers: corsHeaders,
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { authToken } = body;

    if (!authToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Access denied. No token provided.' })
      };
    }

    // Verify the token
    const nestedPayload = await verifyToken(authToken);
    const userId = nestedPayload.user_id; // Assuming the token contains a field 'user_id' for the user's UUID
    console.log('Verified user_id:', userId);

    if (!userId) {
      throw new Error('User ID is undefined after token verification');
    }

    // Validate that the user exists
    const user = await prisma.user.findUnique({ where: { uuid: userId } });
    if (!user) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "User not found" }) };

    // Delete related data that references the user first
    await prisma.householdMembers.deleteMany({ where: { memberUuid: userId } });

    // Delete the user
    await prisma.user.delete({ where: { uuid: userId } });

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
