const stripe = require('stripe')('sk_test_...');

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = "whsec_a20942aafc242052a8973ad80b4914eb969d8558b61885fde8665857fe9239f8";

exports.handler = async (event, context) => {
  const sig = event.headers['stripe-signature'];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.async_payment_failed':
      const checkoutSessionAsyncPaymentFailed = stripeEvent.data.object;
      // Then define and call a function to handle the event checkout.session.async_payment_failed
      break;
    case 'checkout.session.async_payment_succeeded':
      const checkoutSessionAsyncPaymentSucceeded = stripeEvent.data.object;
      // Then define and call a function to handle the event checkout.session.async_payment_succeeded
      break;
    case 'checkout.session.completed':
      const checkoutSessionCompleted = stripeEvent.data.object;
      // Then define and call a function to handle the event checkout.session.completed
      break;
    case 'checkout.session.expired':
      const checkoutSessionExpired = stripeEvent.data.object;
      // Then define and call a function to handle the event checkout.session.expired
      break;
    case 'entitlements.active_entitlement_summary.updated':
      const entitlementsActiveEntitlementSummaryUpdated = stripeEvent.data.object;
      // Then define and call a function to handle the event entitlements.active_entitlement_summary.updated
      break;
    case 'refund.created':
      const refundCreated = stripeEvent.data.object;
      // Then define and call a function to handle the event refund.created
      break;
    case 'refund.updated':
      const refundUpdated = stripeEvent.data.object;
      // Then define and call a function to handle the event refund.updated
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
