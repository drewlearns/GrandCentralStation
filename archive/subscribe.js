const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { email, paymentMethodId, priceId } = JSON.parse(event.body);

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'User not found' }),
    };
  }

  try {
    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set the default payment method for the customer
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: priceId }], // Use the passed price ID
      expand: ['latest_invoice.payment_intent'],
    });

    // Update the user's subscription status in the database
    await prisma.user.update({
      where: { email: email },
      data: {
        subscriptionStatus: 'active',
        subscriptionId: subscription.id,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000), // Stripe returns timestamp in seconds
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription created successfully', subscriptionId: subscription.id }),
    };
  } catch (error) {
    console.error('Error creating subscription:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to create subscription', errorDetails: error.message }),
    };
  }
};
