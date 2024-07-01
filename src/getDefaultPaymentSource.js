const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { authToken, householdId } = JSON.parse(event.body);

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

  if (!householdId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'householdId must be provided.'
      }),
    };
  }

  try {
    // Get the default payment source for the household
    const preference = await prisma.preferences.findUnique({
      where: {
        householdId_preferenceType: {
          householdId: householdId,
          preferenceType: 'defaultPaymentSource'
        },
      },
    });

    if (!preference) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Default payment source not found.',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        defaultPaymentSource: preference.preferenceValue,
      }),
    };
  } catch (error) {
    console.error('Error getting default payment source:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Error getting default payment source',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};