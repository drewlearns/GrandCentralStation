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

  const { uuid, isMonthly, isAnnually, isForever } = body;

  // Determine the subscription end date
  let subscriptionEndDate;
  const currentDate = new Date();
  if (isMonthly) {
    subscriptionEndDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
  } else if (isAnnually) {
    subscriptionEndDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
  } else if (isForever) {
    subscriptionEndDate = new Date(9999, 11, 31); // a far future date
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid subscription type' }),
    };
  }

  try {
    await prisma.user.update({
      where: { uuid },
      data: {
        subscriptionStatus: 'active',
        subscriptionEndDate: subscriptionEndDate,
      },
    });

    console.log('User updated successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription updated successfully' }),
    };
  } catch (err) {
    console.error('Error updating user:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating subscription', error: err.message }),
    };
  }
};
