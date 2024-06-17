const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, refreshToken, sourceId, householdId, sourceName, sourceType, details } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!sourceId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'sourceId is required.'
      })
    };
  }

  let username;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    username = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      username = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
      };
    }
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.' }),
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
          message: 'You do not have permission to edit this payment source',
        }),
      };
    }

    const updatedPaymentSource = await prisma.paymentSource.update({
      where: { sourceId: sourceId },
      data: {
        sourceName: sourceName,
        sourceType: sourceType,
        details: details,
        updatedAt: new Date(),
      },
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Payment source updated successfully",
        paymentSource: updatedPaymentSource,
      }),
    };
  } catch (error) {
    console.error(`Error updating payment source: ${error.message}`);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error updating payment source",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
