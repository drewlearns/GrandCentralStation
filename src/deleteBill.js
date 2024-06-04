const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, billId } = JSON.parse(event.body);

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

  try {
    if (!billId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing billId parameter" }),
      };
    }

    const bill = await prisma.bill.findUnique({
      where: { billId: billId },
    });

    if (!bill) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Bill not found" }),
      };
    }

    const ledgerEntries = await prisma.ledger.findMany({
      where: { billId: billId },
    });

    // Delete the bill
    await prisma.bill.delete({
      where: { billId: billId },
    });

    // Delete ledger entries associated with the bill
    for (const entry of ledgerEntries) {
      await prisma.ledger.delete({
        where: { ledgerId: entry.ledgerId },
      });
    }

    // Invoke deleteNotification.js Lambda to delete the associated notification
    const deleteNotificationCommand = new InvokeCommand({
      FunctionName: 'deleteNotification',
      Payload: JSON.stringify({
        authorizationToken,
        notificationId: bill.notificationId, // assuming the bill has a notificationId field
      })
    });

    const deleteNotificationResponse = await lambdaClient.send(deleteNotificationCommand);
    const deleteNotificationPayload = JSON.parse(new TextDecoder('utf-8').decode(deleteNotificationResponse.Payload));

    if (deleteNotificationResponse.FunctionError) {
      throw new Error(deleteNotificationPayload.errorMessage || 'Notification deletion failed.');
    }

    // Invoke the updateRunningTotal Lambda function to update running totals
    const updateTotalsCommand = new InvokeCommand({
      FunctionName: 'updateRunningTotal',
      Payload: JSON.stringify({ householdId: bill.householdId, paymentSourceId: bill.paymentSourceId }),
    });

    await lambdaClient.send(updateTotalsCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Bill, associated ledger entries, and notification deleted successfully" }),
    };
  } catch (error) {
    console.error(`Error deleting bill ${billId}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error deleting bill", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
