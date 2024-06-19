const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'us-east-1' });

const sendEmail = async (email, firstName) => {
  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Dear ${firstName},\n\nYour trial period has expired. Please consider subscribing to continue using our services.\n\nBest regards,\nThe Purple Piggy Bank`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Trial Period Expired',
      },
    },
    Source: 'noreply@app.thepurplepiggybank.com',
  };

  const command = new SendEmailCommand(params);
  return sesClient.send(command);
};

exports.handler = async () => {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.setDate(now.getDate() - 14));

  try {
    // Find all users in 'trial' status whose signupDate is older than 14 days and haven't been emailed yet
    const usersToDeactivate = await prisma.user.findMany({
      where: {
        subscriptionStatus: 'trial',
        signupDate: {
          lt: fourteenDaysAgo,
        },
        emailSent: false, // Ensure we only get users who haven't been emailed yet
      },
    });

    // Update the subscriptionStatus to 'deactivated' for those users and send email
    const updatePromises = usersToDeactivate.map(async (user) => {
      await prisma.user.update({
        where: { uuid: user.uuid },
        data: { 
          subscriptionStatus: 'deactivated',
          emailSent: true, // Mark as emailed
        },
      });
      await sendEmail(user.email, user.firstName);
    });

    await Promise.all(updatePromises);

    console.log(`Deactivated ${usersToDeactivate.length} users and sent emails`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Users deactivated and emails sent successfully' }),
    };
  } catch (error) {
    console.error('Error deactivating users:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', errorDetails: error.message }),
    };
  }
};
