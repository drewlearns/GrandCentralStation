const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { householdId, paymentSourceId } = JSON.parse(event.body);

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
    // Check if the preference already exists
    const existingPreference = await prisma.preferences.findFirst({
      where: {
        householdId: householdId,
        preferenceType: 'defaultPaymentSource',
      },
    });

    let preference;

    if (existingPreference) {
      // Update existing preference
      preference = await prisma.preferences.update({
        where: { preferenceId: existingPreference.preferenceId },
        data: {
          preferenceValue: paymentSourceId,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new preference
      preference = await prisma.preferences.create({
        data: {
          householdId: householdId,
          preferenceType: 'defaultPaymentSource',
          preferenceValue: paymentSourceId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Default payment source set successfully.',
        defaultPaymentSource: preference.preferenceValue,
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
