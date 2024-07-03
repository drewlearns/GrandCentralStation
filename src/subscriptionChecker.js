const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const userUuid = body.uuid;

  if (!userUuid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'User UUID is required' }),
    };
  }

  try {
    // Fetch user from the database
    const user = await prisma.user.findUnique({
      where: {
        uuid: userUuid,
      },
      select: {
        subscriptionEndDate: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    // Check subscription status
    const subscriptionStatus = user.subscriptionStatus;
    const subscriptionEndDate = user.subscriptionEndDate ? user.subscriptionEndDate.toISOString().split('T')[0] : null;
    let isActive = false;
    let isExpired = false;
    let isTrial = false;
    let isCancelled = false;

    if (subscriptionStatus === 'active') {
      isActive = true;
    } else if (subscriptionStatus === 'expired') {
      isExpired = true;
    } else if (subscriptionStatus === 'trial') {
      isTrial = true;
    } else if (subscriptionStatus === 'cancelled') {
      isCancelled = true;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        subscriptionEndDate: subscriptionEndDate,
        active: isActive,
        expired: isExpired,
        trial: isTrial,
        cancelled: isCancelled,
      }),
    };
  } catch (error) {
    console.error('Error fetching user subscription status:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
