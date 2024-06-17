const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();

const getUserIdFromReceipt = (unified_receipt) => {
  // Implement this function to extract userId from the unified_receipt
};

const verifyAppleReceipt = async (latest_receipt) => {
  // Implement this function to verify the Apple receipt
};

exports.handler = async (event) => {
  const notification = JSON.parse(event.body);
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

  const { authorizationToken, refreshToken } = notification;

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let tokenValid = false;
  let updatedBy;

  // First attempt to verify the token
  try {
    updatedBy = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      updatedBy = result.userId;
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

  if (notification.notification_type === 'RENEWAL') {
    const { auto_renew_status, latest_receipt, unified_receipt } = notification;
    const userId = getUserIdFromReceipt(unified_receipt); // Implement this function to extract userId

    // Verify the receipt and update subscription status
    const response = await verifyAppleReceipt(latest_receipt); // Implement this function
    if (response.status === 0) {
      await prisma.user.update({
        where: { uuid: userId },
        data: {
          subscriptionStatus: auto_renew_status === 'true' ? 'active' : 'inactive',
          subscriptionEndDate: new Date(response.latest_receipt_info[0].expires_date),
        },
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
    headers: corsHeaders,
  };
};
