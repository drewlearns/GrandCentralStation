const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};
exports.handler = async (event) => {
  const { authorizationToken, householdId, threshold } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Access denied. No token provided.' })
    };
  }

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken })
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    username = payload.username;
    if (!username) {
      throw new Error('Token verification did not return a valid username.');
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.', error: error.message }),
    };
  }

  try {
    if (!householdId || !threshold) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing householdId or threshold parameter" }),
      };
    }

    // Check if a threshold preference already exists for the household
    const existingPreference = await prisma.preferences.findUnique({
      where: {
        householdId_preferenceType: {
          householdId: householdId,
          preferenceType: 'threshold'
        }
      }
    });

    if (existingPreference) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Threshold preference already exists.' }),
      };
    }

    // Create a new threshold preference
    await prisma.preferences.create({
      data: {
        preferenceId: uuidv4(),
        householdId: householdId,
        preferenceType: 'threshold',
        preferenceValue: threshold.toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Threshold preference created successfully.' }),
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error processing request", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
