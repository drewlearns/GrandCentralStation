const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { receiptData, platform, userId, authorizationToken, refreshToken } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token or refresh token provided.'
      }),
    };
  }

  let tokenValid = false;

  // First attempt to verify the token
  try {
    await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      await refreshAndVerifyToken(authorizationToken, refreshToken);
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Invalid token.',
          error: refreshError.message,
        }),
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
    let response;
    let subscriptionId;
    let subscriptionEndDate;

    if (platform === 'ios') {
      response = await axios.post('https://buy.itunes.apple.com/verifyReceipt', {
        'receipt-data': receiptData,
        'password': process.env.APPLE_SHARED_SECRET
      });

      if (response.data.status === 0) {
        subscriptionId = response.data.receipt.in_app[0].transaction_id;
        subscriptionEndDate = new Date(response.data.receipt.in_app[0].expires_date_ms);
      }
    } else if (platform === 'android') {
      const { packageName, subscriptionId: subId, token } = receiptData;
      response = await axios.get(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subId}/tokens/${token}`, {
        headers: {
          'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`
        }
      });

      if (response.data.purchaseState === 0) {
        subscriptionId = response.data.orderId;
        subscriptionEndDate = new Date(parseInt(response.data.expiryTimeMillis));
      }
    }

    if (subscriptionId) {
      // Update the user's subscription in the database
      await prisma.user.update({
        where: { uuid: userId },
        data: {
          subscriptionId: subscriptionId,
          subscriptionStatus: 'active',
          subscriptionEndDate: subscriptionEndDate,
        }
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true })
      };
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, message: 'Invalid purchase' })
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
