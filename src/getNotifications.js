const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { authorizationToken } = body;

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

    // Find the user by username (uuid)
    const user = await prisma.user.findUnique({
      where: { uuid: username },
      select: { uuid: true }
    });

    if (!user) {
      console.log(`User with username ${username} not found`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    const userUuid = user.uuid;

    // Get households associated with the user
    const households = await prisma.householdMembers.findMany({
      where: { memberUuid: userUuid },
      select: { householdId: true }
    });

    if (households.length === 0) {
      console.log(`No households found for user ${userUuid}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No households found for user" }),
      };
    }

    const householdIds = households.map(household => household.householdId);

    // Get bills associated with these households
    const bills = await prisma.bill.findMany({
      where: { householdId: { in: householdIds } },
      select: { billId: true }
    });

    if (bills.length === 0) {
      console.log(`No bills found for households ${householdIds.join(", ")}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No bills found for households" }),
      };
    }

    const billIds = bills.map(bill => bill.billId);

    // Get notifications associated with these bills
    const notifications = await prisma.notification.findMany({
      where: { billId: { in: billIds } },
    });

    if (notifications.length === 0) {
      console.log(`No notifications found for bills ${billIds.join(", ")}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No notifications found" }),
      };
    }

    console.log(`Success: Notifications retrieved for user ${userUuid}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Notifications retrieved successfully",
        notifications: notifications,
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
