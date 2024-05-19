const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, billId, title, message, userUuid, deviceDetails, ipAddress } = body;

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

    const userExists = await prisma.user.findUnique({
      where: { uuid: userUuid },
    });

    if (!userExists) {
      console.log(`Error: User ${userUuid} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    const newNotification = await prisma.notification.create({
      data: {
        notificationId: uuidv4(),
        userUuid: userUuid,
        billId: billId,
        title: title,
        message: message,
        read: false,
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
