const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId, newThreshold} = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
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
      body: JSON.stringify({ message: 'Invalid token.', error: error.message }),
    };
  }

  try {
    if (!householdId || !newThreshold) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing householdId or newThreshold parameter" }),
      };
    }

    // Update the threshold in the preferences table
    const updatedPreference = await prisma.preferences.updateMany({
      where: {
        householdId: householdId,
        preferenceType: 'threshold' // Use the unique constraint fields
      },
      data: {
        preferenceValue: newThreshold.toString() // Assuming threshold value should be stored as string
      }
    });

    if (updatedPreference.count === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No matching record found to update.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Threshold updated successfully.' }),
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
