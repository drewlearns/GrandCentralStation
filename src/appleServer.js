const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
};

const handleAppleSubscription = (notification) => {
  const latestReceiptInfo = notification.unified_receipt.latest_receipt_info[0];
  const { original_transaction_id, transaction_id, expires_date, cancellation_date } = latestReceiptInfo;
  const purchaseDate = cancellation_date ? new Date(parseInt(cancellation_date)) : new Date();
  const subscriptionEndDate = expires_date ? new Date(parseInt(expires_date)) : null;

  return {
    platform: 'apple',
    platformIdentifier: original_transaction_id,
    transactionId: transaction_id,
    purchaseDate,
    subscriptionEndDate,
    receiptData: JSON.stringify(notification),
    notificationType: notification.notification_type,
  };
};

exports.handler = async (event) => {
  let body;

  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (error) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid JSON input' }),
    };
  }

  let subscriptionData;

  try {
    if (body.unified_receipt && body.notification_type) {
      // Handle Apple subscription
      subscriptionData = handleAppleSubscription(body);
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Unsupported notification format' }),
      };
    }

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

    // Perform specific actions based on the notification type
    switch (subscriptionData.notificationType) {
      case 'INITIAL_BUY':
        await prisma.user.updateMany({
          where: { email: subscriptionData.platformIdentifier },
          data: {
            subscriptionEndDate: subscriptionData.subscriptionEndDate,
            subscriptionStatus: 'active',
            purchaseToken: subscriptionData.transactionId,
            receiptData: subscriptionData.receiptData,
            updatedAt: new Date(),
          },
        });
        break;
      case 'RENEWAL':
        await prisma.user.updateMany({
          where: { email: subscriptionData.platformIdentifier },
          data: {
            subscriptionEndDate: subscriptionData.subscriptionEndDate,
            subscriptionStatus: 'active',
            receiptData: subscriptionData.receiptData,
            updatedAt: new Date(),
          },
        });
        break;
      case 'CANCEL':
        await prisma.user.updateMany({
          where: { email: subscriptionData.platformIdentifier },
          data: {
            subscriptionStatus: 'canceled',
            updatedAt: new Date(),
          },
        });
        break;
      case 'DID_FAIL_TO_RENEW':
        await prisma.user.updateMany({
          where: { email: subscriptionData.platformIdentifier },
          data: {
            subscriptionStatus: 'failed_to_renew',
            updatedAt: new Date(),
          },
        });
        break;
      case 'DID_RECOVER':
        await prisma.user.updateMany({
          where: { email: subscriptionData.platformIdentifier },
          data: {
            subscriptionEndDate: subscriptionData.subscriptionEndDate,
            subscriptionStatus: 'active',
            receiptData: subscriptionData.receiptData,
            updatedAt: new Date(),
          },
        });
        break;
      default:
        console.log('Unhandled notification type:', subscriptionData.notificationType);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(subscription),
    };
  } catch (error) {
    console.error('Error storing subscription:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Failed to store subscription', errorDetails: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
