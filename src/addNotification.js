const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { authorizationToken, billId, title, message, deviceDetails, ipAddress } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
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
      console.log(`Error: Bill ${billId} does not exist`);
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
        dayOfMonth: billExists.dayOfMonth,  // Include the dayOfMonth field from the bill
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Notification',
        actionType: 'Create',
        oldValue: '',
        newValue: JSON.stringify(newNotification),
        changedBy: updatedBy,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    console.log(`Success: Notification added for bill ${billId}`);
    return {
      statusCode: 201,
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
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
