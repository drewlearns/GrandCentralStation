const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
};

exports.handler = async (event) => {
  let body;
  console.log("Incoming event:", JSON.stringify(event));
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    console.log("Parsed body:", JSON.stringify(body));
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid JSON input' }),
    };
  }

  try {
    const notification = body.event;

    if (!notification) {
      console.error("Notification event data is missing in parsed body:", JSON.stringify(body));
      throw new Error('Notification event data is missing');
    }

    const platformIdentifier = notification.original_transaction_id || notification.app_user_id;
    let transactionId = notification.transaction_id ? String(notification.transaction_id) : `unknown-${Date.now()}`;
    const purchaseDate = notification.purchased_at_ms ? new Date(notification.purchased_at_ms) : null;
    const subscriptionEndDate = notification.expiration_at_ms ? new Date(notification.expiration_at_ms) : null;

    if (!platformIdentifier || !purchaseDate) {
      console.error('Required subscription data is missing', { platformIdentifier, transactionId, purchaseDate });
      throw new Error('Required subscription data is missing');
    }

    const subscriptionData = {
      platform: 'apple',
      platformIdentifier,
      transactionId,
      purchaseDate,
      subscriptionEndDate,
      receiptData: notification.id, // Assuming 'id' here is used for receipt data
      notificationType: notification.type,
    };

    console.log('Subscription Data:', subscriptionData);

    // Store the subscription data
    const subscription = await prisma.unverifiedSubscription.create({
      data: {
        platform: subscriptionData.platform,
        platformIdentifier: subscriptionData.platformIdentifier,
        transactionId: subscriptionData.transactionId,
        purchaseDate: subscriptionData.purchaseDate,
        subscriptionEndDate: subscriptionData.subscriptionEndDate,
        receiptData: subscriptionData.receiptData,
        notificationType: subscriptionData.notificationType,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Store a temporary mapping (assuming we have a way to temporarily map the platformIdentifier to the user)
    if (body.userUuid) {
      await prisma.tempIdentifierMapping.create({
        data: {
          platformIdentifier: subscriptionData.platformIdentifier,
          userUuid: body.userUuid,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Perform specific actions based on the notification type
    switch (subscriptionData.notificationType) {
      case 'INITIAL_BUY':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'DID_RECOVER':
        // Active subscription events
        await prisma.user.updateMany({
          where: { subscriptionId: subscriptionData.platformIdentifier },
          data: {
            subscriptionEndDate: subscriptionData.subscriptionEndDate,
            subscriptionStatus: 'active',
            purchaseToken: subscriptionData.transactionId,
            receiptData: subscriptionData.receiptData,
            updatedAt: new Date(),
          },
        });
        break;
      case 'CANCEL':
        await prisma.user.updateMany({
          where: { subscriptionId: subscriptionData.platformIdentifier },
          data: {
            subscriptionStatus: 'canceled',
            updatedAt: new Date(),
          },
        });
        break;
      case 'DID_FAIL_TO_RENEW':
        await prisma.user.updateMany({
          where: { subscriptionId: subscriptionData.platformIdentifier },
          data: {
            subscriptionStatus: 'failed_to_renew',
            updatedAt: new Date(),
          },
        });
        break;
      case 'TEST':
        console.log("TEST");
        break;
      default:
        console.log('Unhandled notification type:', subscriptionData.notificationType);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(subscription) || "",
    };
  } catch (error) {
    console.error('Error storing subscription:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Failed to store subscription', errorDetails: error.message }) || "",
    };
  } finally {
    await prisma.$disconnect();
  }
};
