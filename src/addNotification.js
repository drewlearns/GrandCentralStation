const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
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
    const { authorizationToken, billId, title, message } = body;

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

    const billExists = await prisma.bill.findUnique({
      where: { billId: billId },
    });

    if (!billExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Bill not found" }),
      };
    }

    // Get household members' emails
    const householdMembers = await prisma.householdMembers.findMany({
      where: { householdId: billExists.householdId },
      select: { user: { select: { email: true } } },
    });

    const recipientEmails = householdMembers.map(member => member.user.email).join(';');

    // In addNotification.js, ensure dueDate is included
    const newNotification = await prisma.notification.create({
      data: {
        notificationId: uuidv4(),
        userUuid: updatedBy,
        billId: billId,
        title: title,
        message: message,
        recipientEmail: recipientEmails,
        read: false,
        sent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: new Date(billExists.createdAt.getUTCFullYear(), billExists.createdAt.getUTCMonth(), billExists.dayOfMonth), // Calculate dueDate
      },
    });


    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Notification added successfully",
        notification: newNotification,
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
