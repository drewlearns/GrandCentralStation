const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, incomeId } = body;

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

    if (!incomeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing incomeId parameter" }),
      };
    }

    const income = await prisma.incomes.findUnique({
      where: { incomeId: incomeId },
      include: {
        household: true,
        ledger: true,
      },
    });

    if (!income) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Income not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ income: income }),
    };
  } catch (error) {
    console.error('Error retrieving income:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving income", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
