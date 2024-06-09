const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, transactionId } = JSON.parse(event.body);

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
    if (!transactionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing transactionId parameter" }),
      };
    }

    const transaction = await prisma.transaction.findUnique({
      where: { transactionId: transactionId },
      include: {
        ledger: true,
        paymentSource: true
      }
    });

    if (!transaction) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Transaction not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ transaction: transaction }),
    };
  } catch (error) {
    console.error(`Error retrieving transaction ${transactionId}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving transaction", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
