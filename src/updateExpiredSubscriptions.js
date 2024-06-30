const { PrismaClient } = require('@prisma/client');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const prisma = new PrismaClient();

const sesClient = new SESClient({ region: 'us-east-1' }); // Adjust the region as needed

async function sendEmail(toAddress, subject, body) {
  const params = {
    Destination: {
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Text: { Data: body },
      },
      Subject: { Data: subject },
    },
    Source: 'noreply@app.thepurplepiggybank.com',
  };

  try {
    const data = await sesClient.send(new SendEmailCommand(params));
    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

exports.handler = async (event) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // Set to the beginning of the day

  try {
    // Fetch users who are in trial or active status and whose subscription ends today
    const users = await prisma.user.findMany({
      where: {
        subscriptionStatus: {
          in: ['trial', 'active'],
        },
        subscriptionEndDate: {
          lte: new Date(today.setHours(23, 59, 59, 999)),  // End of the day
        },
      },
    });

    // Update the subscription status of these users to 'expired' and send an email
    for (const user of users) {
      await prisma.user.update({
        where: { uuid: user.uuid },
        data: { subscriptionStatus: 'expired' },
      });

      const subject = 'Your Subscription Has Expired';
      const body = `Hello ${user.firstName},\n\nYour subscription has expired as of today. Please renew your subscription to continue enjoying our services.\n\nBest regards,\nThe Purple Piggy Bank`;

      await sendEmail(user.email, subject, body);
      console.log(`Updated user ${user.uuid} subscription status to expired and sent email`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription statuses updated and emails sent successfully' }),
    };
  } catch (error) {
    console.error('Error updating subscription statuses:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
