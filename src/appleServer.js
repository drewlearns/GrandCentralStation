const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    console.error('Error parsing JSON body:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON format' }),
    };
  }

  console.log('Received event:', body);

  const eventType = body.event.type;
  
  try {
    switch (eventType) {
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(body.event);
        break;
      case 'RENEWAL':
        await handleRenewal(body.event);
        break;
      case 'CANCELLATION':
        await handleCancellation(body.event);
        break;
      case 'UNCANCELLATION':
        await handleUncancellation(body.event);
        break;
      case 'BILLING_ISSUE':
        await handleBillingIssue(body.event);
        break;
      case 'SUBSCRIPTION_PAUSED':
        await handleSubscriptionPaused(body.event);
        break;
      case 'SUBSCRIPTION_REACTIVATED':
        await handleSubscriptionReactivated(body.event);
        break;
      case 'TRANSFER':
        await handleTransfer(body.event);
        break;
      case 'EXPIRATION':
        await handleExpiration(body.event);
        break;
      case 'NON_RENEWING_PURCHASE':
        await handleNonRenewingPurchase(body.event);
        break;
      default:
        console.warn(`Unhandled notification type: ${eventType}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Event processed' }),
    };
  } catch (error) {
    console.error('Error processing event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error processing event', error: error.message }),
    };
  }
};

const handleInitialPurchase = async (event) => {
  console.log('Handling initial purchase event:', event);
  const { original_app_user_id, subscription_expiration_date, purchase_token, receipt_data } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'active',
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
        purchaseToken: purchase_token,
        receiptData: receipt_data,
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleRenewal = async (event) => {
  console.log('Handling renewal event:', event);
  const { original_app_user_id, subscription_expiration_date } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'active',
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleCancellation = async (event) => {
  console.log('Handling cancellation event:', event);
  const { original_app_user_id, subscription_expiration_date } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleUncancellation = async (event) => {
  console.log('Handling uncancellation event:', event);
  const { original_app_user_id, subscription_expiration_date } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'active',
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleBillingIssue = async (event) => {
  console.log('Handling billing issue event:', event);
  const { original_app_user_id } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'billing_issue',
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleSubscriptionPaused = async (event) => {
  console.log('Handling subscription paused event:', event);
  const { original_app_user_id } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'paused',
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleSubscriptionReactivated = async (event) => {
  console.log('Handling subscription reactivated event:', event);
  const { original_app_user_id, subscription_expiration_date } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'active',
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleTransfer = async (event) => {
  console.log('Handling transfer event:', event);
  const { original_app_user_id, subscription_expiration_date, purchase_token, receipt_data } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'active',
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
        purchaseToken: purchase_token,
        receiptData: receipt_data,
      },
    });
    console.log('User transferred successfully');
  } catch (err) {
    console.error('Error transferring user:', err);
    throw err;
  }
};

const handleExpiration = async (event) => {
  console.log('Handling expiration event:', event);
  const { original_app_user_id, subscription_expiration_date } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'expired',
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

const handleNonRenewingPurchase = async (event) => {
  console.log('Handling non-renewing purchase event:', event);
  const { original_app_user_id, purchase_token, receipt_data, subscription_expiration_date } = event;
  try {
    await prisma.user.update({
      where: { uuid: original_app_user_id },
      data: {
        subscriptionStatus: 'non_renewing',
        purchaseToken: purchase_token,
        receiptData: receipt_data,
        subscriptionEndDate: subscription_expiration_date ? new Date(subscription_expiration_date) : null,
      },
    });
    console.log('User updated successfully');
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};
