const { PrismaClient } = require('@prisma/client');
const { verifyGooglePurchase, getUserIdFromToken } = require('./googleUtils'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  try {
    const notification = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));

    if (notification.subscriptionNotificationType === 1) { // 1 indicates subscription renewals
      const { purchaseToken, subscriptionId } = notification;
      const userId = await getUserIdFromToken(purchaseToken); // Implement this function to extract userId

      if (!userId) {
        throw new Error('User ID not found in purchase token.');
      }

      // Verify the purchase token and update subscription status
      const response = await verifyGooglePurchase(subscriptionId, purchaseToken); // Implement this function

      if (response.purchaseState === 0) {
        await prisma.user.update({
          where: { uuid: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionEndDate: new Date(Number(response.expiryTimeMillis)),
          },
        });
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error processing subscription renewal:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

// googleUtils.js

const { google } = require('googleapis');

const verifyGooglePurchase = async (subscriptionId, purchaseToken) => {
  const client = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/androidpublisher']
  );

  const androidpublisher = google.androidpublisher({ version: 'v3', auth: client });

  const res = await androidpublisher.purchases.subscriptions.get({
    packageName: process.env.GOOGLE_PACKAGE_NAME,
    subscriptionId: subscriptionId,
    token: purchaseToken,
  });

  return res.data;
};

const getUserIdFromToken = async (purchaseToken) => {
  // Implement logic to extract user ID from purchase token.
  // This might involve decoding the token or using a database lookup.
  return 'extracted-user-id';
};

module.exports = {
  verifyGooglePurchase,
  getUserIdFromToken,
};
