const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

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

  return payload.isValid;
}

exports.handler = async (event) => {
  const { authorizationToken, billId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  try {
    // Verify the token
    const isValid = await verifyToken(authorizationToken);
    if (!isValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.' }),
      };
    }

    if (!billId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing billId parameter" }),
      };
    }

    const bill = await prisma.bill.findUnique({
      where: { billId: billId },
    });

    if (!bill) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Bill not found" }),
      };
    }

    const secretArn = bill.username; // Assuming username field stores the ARN
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsManagerClient.send(command);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ secret: JSON.parse(response.SecretString) }),
    };
  } catch (error) {
    console.error(`Error retrieving secret for bill ${billId}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error retrieving secret", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
