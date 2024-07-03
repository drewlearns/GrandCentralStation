const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stripe = require('stripe')(process.env.STRIPE_SK);
const endpointSecret = 'whsec_W3mNZT3xVo7KTP3tlHy1jJKwbP50Jzfq';

async function updateUserSubscriptionStatus(stripeCustomerId, subscriptionStatus, endDate = null) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        uuid: stripeCustomerId,
      },
    });

    if (!user) {
      console.error('User not found in database');
      return;
    }

    const dataToUpdate = {
      subscriptionStatus,
    };

    if (endDate) {
      dataToUpdate.subscriptionEndDate = endDate;
    }

    const updatedUser = await prisma.user.update({
      where: {
        uuid: stripeCustomerId,
      },
      data: dataToUpdate,
    });

    console.log('User subscription status updated successfully', updatedUser);
  } catch (error) {
    console.error('Error updating user subscription status:', error);
  }
}

exports.handler = async (event) => {
  const headers = event.headers || {};

  const sig = headers['Stripe-Signature'] || headers['stripe-signature'];
  const rawBody = event.body;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  console.log(`Received event: ${stripeEvent.type}`);
  console.log(`Event data: ${JSON.stringify(stripeEvent.data.object)}`);

  const handleSubscriptionEvent = async (subscription, status) => {
    const endDate = status === 'active' ? new Date(subscription.current_period_end * 1000) : null;
    await updateUserSubscriptionStatus(subscription.customer, status, endDate);
  };

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        let subscriptionStatus = 'expired';
        if (subscription.status === 'trialing') {
          subscriptionStatus = 'trial';
        } else if (subscription.status === 'active') {
          subscriptionStatus = 'active';
        } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
          subscriptionStatus = 'cancelled';
        }
        await handleSubscriptionEvent(subscription, subscriptionStatus);
      }
      break;

    case 'customer.subscription.updated':
    case 'customer.subscription.created':
    case 'customer.subscription.trial_will_end':
    case 'customer.subscription.pending_update_applied':
    case 'customer.subscription.resumed':
    case 'customer.subscription.pending_update_expired':
    case 'customer.subscription.paused':
    case 'customer.subscription.deleted':
      const subscription = stripeEvent.data.object;
      let subscriptionStatus = 'expired';
      if (subscription.status === 'trialing') {
        subscriptionStatus = 'trial';
      } else if (subscription.status === 'active') {
        subscriptionStatus = 'active';
      } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
        subscriptionStatus = 'cancelled';
      }
      await handleSubscriptionEvent(subscription, subscriptionStatus);
      break;

    case 'charge.succeeded':
      const charge = stripeEvent.data.object;
      if (charge.customer) {
        let endDate = null;
        if (charge.amount === 299) {
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          await updateUserSubscriptionStatus(charge.customer, 'active', endDate);
        } else if (charge.amount === 2999) {
          endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);
          await updateUserSubscriptionStatus(charge.customer, 'active', endDate);
        } else if (charge.amount === 14999) {
          endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 100);
          await updateUserSubscriptionStatus(charge.customer, 'active', endDate);
        }
      }
      break;

    case 'charge.refunded':
    case 'charge.expired':
    case 'charge.failed':
    case 'charge.pending':
    case 'charge.updated':
    case 'charge.captured':
    case 'charge.dispute.closed':
    case 'charge.dispute.created':
    case 'charge.dispute.funds_reinstated':
    case 'charge.dispute.funds_withdrawn':
    case 'charge.dispute.updated':
    case 'charge.refund.updated':
    case 'refund.created':
    case 'refund.updated':
      const chargeEvent = stripeEvent.data.object;
      if (chargeEvent.customer) {
        await updateUserSubscriptionStatus(chargeEvent.customer, 'expired');
      }
      break;
    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
