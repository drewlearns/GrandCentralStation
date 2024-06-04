const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId} = JSON.parse(event.body);

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
    if (!householdId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing householdId parameter" }),
      };
    }

    // Fetch bills
    const bills = await prisma.bill.findMany({
      where: { householdId: householdId },
      select: {
        billId: true,
        billName: true,
        amount: true,
        frequency: true,
        status: true,
        dayOfMonth: true,
      },
    });

    // Fetch notifications for the bills
    const billIds = bills.map(bill => bill.billId);
    const notifications = await prisma.notification.findMany({
      where: {
        billId: {
          in: billIds,
        },
      },
      select: {
        billId: true,
        notificationId: true,
        title: true,
        message: true,
        read: true,
        sent: true,
        dayOfMonth: true,
      },
    });

    // Map notifications to their corresponding bills
    const billsWithNotifications = bills.map(bill => ({
      ...bill,
      notifications: notifications.filter(notification => notification.billId === bill.billId),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ bills: billsWithNotifications }),
    };
  } catch (error) {
    console.error(`Error retrieving bills for household ${householdId}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving bills", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
