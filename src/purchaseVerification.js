const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { receiptData, platform, userId } = JSON.parse(event.body);

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
        body: JSON.stringify({ success: true })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid purchase' })
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
