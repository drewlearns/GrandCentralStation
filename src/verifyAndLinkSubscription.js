require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
};

const validateAppleSubscription = async (receiptData, useSandbox) => {
  const url = useSandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';

  const response = await axios.post(url, {
    'receipt-data': receiptData,
    'password': process.env.APPLE_SHARED_SECRET, // Use your app's shared secret here
  });

  return response.data;
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

  const { email, useSandbox = false } = body;

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // Find matching unverified subscriptions
    const subscriptions = await prisma.unverifiedSubscription.findMany({
      where: {
        platform: 'apple',
        platformIdentifier: email,
      },
    });

    if (subscriptions.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'No matching subscriptions found' }),
      };
    }

    // Validate and link each subscription
    for (const subscription of subscriptions) {
      let validationResponse = await validateAppleSubscription(subscription.receiptData, useSandbox);

      if (validationResponse.status !== 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Invalid subscription receipt' }),
        };
      }

      // If validation passes, link the subscription to the user
      await prisma.user.update({
        where: { email },
        data: {
          subscriptionEndDate: subscription.subscriptionEndDate,
          subscriptionStatus: 'active',
          purchaseToken: subscription.transactionId,
          receiptData: subscription.receiptData,
          updatedAt: new Date(),
        },
      });

      await prisma.unverifiedSubscription.update({
        where: { id: subscription.id },
        data: { userId: user.uuid },
      });
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Subscription linked successfully' }),
    };
  } catch (error) {
    console.error('Error verifying and linking subscription:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Failed to verify and link subscription', errorDetails: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
