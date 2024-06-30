const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { authToken, householdId, paymentSourceId } = JSON.parse(event.body);

  if (!authToken) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
    };
  }

  if (!householdId || !paymentSourceId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'householdId and paymentSourceId must be provided.'
      }),
    };
  }

  try {
    // Set the default payment source for the household
    await prisma.preferences.upsert({
      where: {
        householdId_preferenceType: {
          householdId: householdId,
          preferenceType: 'defaultPaymentSource'
        },
      },
      update: {
        preferenceValue: paymentSourceId
      },
      create: {
        householdId: householdId,
        preferenceType: 'defaultPaymentSource',
        preferenceValue: paymentSourceId
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Default payment source set successfully.',
      }),
    };
  } catch (error) {
    console.error('Error setting default payment source:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Error setting default payment source',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
