const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, sourceId, householdId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!householdId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Bad request. No householdId provided.'
      })
    };
  }

  let deletedBy;

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

    deletedBy = payload.username;
    if (!deletedBy) {
      throw new Error('Token verification did not return a valid username.');
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    const paymentSource = await prisma.paymentSource.findUnique({
      where: { sourceId: sourceId },
    });

    if (!paymentSource) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Payment source not found" }),
      };
    }

    if (paymentSource.householdId !== householdId) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'You do not have permission to delete this payment source',
        }),
      };
    }

    const deletedPaymentSource = await prisma.paymentSource.delete({
      where: { sourceId: sourceId },
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Payment source deleted successfully",
        paymentSource: deletedPaymentSource,
      }),
    };
  } catch (error) {
    console.error(`Error deleting payment source: ${error.message}`);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error deleting payment source",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
