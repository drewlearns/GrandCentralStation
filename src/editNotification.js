const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { authorizationToken, notificationId, title, message, read, deviceDetails, ipAddress } = body;

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

    const notificationExists = await prisma.notification.findUnique({
      where: { notificationId: notificationId },
    });

    if (!notificationExists) {
      console.log(`Error: Notification ${notificationId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Notification not found" }),
      };
    }

    const updatedNotification = await prisma.notification.update({
      where: { notificationId: notificationId },
      data: {
        title: title || notificationExists.title,
        message: message || notificationExists.message,
        read: read !== undefined ? read : notificationExists.read,
        updatedAt: new Date(),
      },
    });

    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Notification',
        actionType: 'Update',
        oldValue: JSON.stringify(notificationExists),
        newValue: JSON.stringify(updatedNotification),
        changedBy: updatedBy,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    console.log(`Success: Notification ${notificationId} updated`);
    return {
      statusCode: 200,
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
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
