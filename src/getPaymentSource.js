const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
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
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    const paymentSources = await prisma.paymentSource.findMany({
      where: { householdId: householdId },
    });

    if (paymentSources.length === 0) {
      console.log(`Error: No payment sources found for household ${householdId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No payment sources found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Payment sources retrieved successfully",
        paymentSources: paymentSources,
      }),
    };
  } catch (error) {
    console.error(`Error retrieving payment sources: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error retrieving payment sources",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
