const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    const { email, paymentMethodId, priceId } = requestBody;

    // Create a new customer
    const customer = await stripe.customers.create({
      email: email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
