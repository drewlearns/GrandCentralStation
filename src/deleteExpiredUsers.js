const { PrismaClient } = require('@prisma/client');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { subDays } = require('date-fns');

const prisma = new PrismaClient();
const sesClient = new SESClient({ region: process.env.AWS_REGION });

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function sendWarningEmail(userEmail) {
  const params = {
    Destination: {
      ToAddresses: [userEmail],
    },
    Message: {
      Body: {
        Text: {
          Data: `Hey there, \n We will be permanently deleting your account in 10 days due to it being expired if you don't take action to resubscribe before then. \n \n If you need assistance, don't hesitate to reach out to us via help@thepurplepiggybank.com or via the web at help.ThePuplePiggyBank.com. \n Warm Regards, \n The Purple Piggy Bank \n https://app.thepurplepiggybank.com`,
        }
      },
      Subject: {
        Data: `Account Deletion Warning`,
      },
    },
    Source: `noreply@app.thepurplepiggybank.com`,
  };

  const command = new SendEmailCommand(params);
  await sesClient.send(command);
  console.log(`Warning email sent to: ${userEmail}`);
}

exports.handler = async (event) => {
  try {
    // Calculate the expiration threshold dates
    const now = new Date();
    const expirationThreshold = subDays(now, 60);
    const warningThreshold = subDays(now, 50);

    // Fetch users whose subscription end date is between 50 and 60 days in the past
    const usersToWarn = await prisma.user.findMany({
      where: {
        subscriptionEndDate: {
          lte: warningThreshold,
          gte: expirationThreshold,
        },
        emailSent: false,
      },
    });

    // Send warning emails to these users
    for (const user of usersToWarn) {
      await sendWarningEmail(user.email);
      
      // Update emailSent to true after sending the warning email
      await prisma.user.update({
        where: { uuid: user.uuid },
        data: { emailSent: true },
      });
    }

    // Fetch users whose subscription end date is more than 60 days in the past
    const usersToDelete = await prisma.user.findMany({
      where: {
        subscriptionEndDate: {
          lt: expirationThreshold,
        },
      },
    });

    // Delete users and related data
    for (const user of usersToDelete) {
      const userId = user.uuid;

      // Delete related data
      await prisma.householdMembers.deleteMany({ where: { memberUuid: userId } });
      await prisma.notifications.deleteMany({ where: { userUuid: userId } });
      await prisma.unverifiedSubscriptions.deleteMany({ where: { userUuid: userId } });
      await prisma.invitations.deleteMany({ where: { invitedUserUuid: userId } });

      // Delete the user
      await prisma.user.delete({ where: { uuid: userId } });

      console.log(`User deleted successfully: ${userId}`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Process completed successfully" })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error processing request", error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
