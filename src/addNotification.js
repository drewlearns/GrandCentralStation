const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
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
    const { authorizationToken, refreshToken, billId, title, message } = body;

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
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      updatedBy = result.userId;
      authorizationToken = result.newToken; // Update authorizationToken with new token
      tokenValid = true;
    }

    if (!tokenValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.' }),
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
