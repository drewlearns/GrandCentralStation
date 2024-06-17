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
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { authorizationToken, refreshToken, notificationId } = body;

    if (!authorizationToken || !refreshToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;
    let tokenValid = false;

    // First attempt to verify the token
    try {
      updatedBy = await verifyToken(authorizationToken);
      tokenValid = true;
    } catch (error) {
      console.error('Token verification failed, attempting refresh:', error.message);

      // Attempt to refresh the token and verify again
      try {
        const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
        updatedBy = result.userId;
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

    const notification = await prisma.notification.findUnique({
      where: { notificationId: notificationId },
    });

    if (!notification) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Notification not found" }),
      };
    }

    await prisma.notification.delete({
      where: { notificationId: notificationId },
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Notification deleted successfully",
      }),
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
