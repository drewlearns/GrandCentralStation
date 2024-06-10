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
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { authorizationToken, notificationId, billId, title, message, dayOfMonth } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;

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

      updatedBy = payload.username;
      if (!updatedBy) {
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

    if (!notificationId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing notificationId parameter" }),
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

    let recipientEmails = notification.recipientEmail;

    if (billId && billId !== notification.billId) {
      const billExists = await prisma.bill.findUnique({
        where: { billId: billId },
      });

      if (!billExists) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ message: "Bill not found" }),
        };
      }

      const householdMembers = await prisma.householdMembers.findMany({
        where: { householdId: billExists.householdId },
        select: { user: { select: { email: true } } },
      });

      recipientEmails = householdMembers.map(member => member.user.email).join(';');
    }

    const updatedNotification = await prisma.notification.update({
      where: { notificationId: notificationId },
      data: {
        billId: billId || notification.billId,
        title: title || notification.title,
        message: message || notification.message,
        dayOfMonth: dayOfMonth !== undefined ? parseInt(dayOfMonth) : notification.dayOfMonth,
        recipientEmail: recipientEmails,
        updatedAt: new Date(),
      },
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Notification updated successfully",
        notification: updatedNotification,
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
