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
  const { authorizationToken, refreshToken, billId } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
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
    if (!billId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing billId parameter" }),
      };
    }

    const bill = await prisma.bill.findUnique({
      where: { billId: billId },
    });

    if (!bill) {
      return {
        statusCode: 404,
        headers: corsHeaders,
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
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: bill.householdId, paymentSourceId: bill.paymentSourceId }),
    });

    await lambdaClient.send(updateTotalsCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Bill, associated ledger entries, and notification deleted successfully" }),
    };
  } catch (error) {
    console.error(`Error deleting bill ${billId}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error deleting bill", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
