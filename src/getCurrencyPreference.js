const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId } = JSON.parse(event.body);

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
    if (!householdId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing householdId parameter" }),
      };
    }

    const preferenceType = 'preferredCurrencySymbol';

    const preference = await prisma.preferences.findUnique({
      where: {
        householdId_preferenceType: {
          householdId: householdId,
          preferenceType: preferenceType
        }
      }
    });

    if (!preference) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Currency preference not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ preference: preference }),
    };
  } catch (error) {
    console.error('Error fetching currency preference:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error fetching currency preference", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
