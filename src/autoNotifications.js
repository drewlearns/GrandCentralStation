const { PrismaClient } = require("@prisma/client");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const prisma = new PrismaClient();
const sesClient = new SESClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const now = new Date();
  const day = now.getUTCDate();
  const month = now.getUTCMonth() + 1; // getUTCMonth() is zero-indexed
  const year = now.getUTCFullYear();

  const targetDay = day;
  const targetDateStart = new Date(Date.UTC(year, month - 1, targetDay, 0, 0, 0)); // start of the target date in UTC
  const targetDateEnd = new Date(Date.UTC(year, month - 1, targetDay, 23, 59, 59, 999)); // end of the target date in UTC

  // Log the target date range
  console.log(`Target Date Range: ${targetDateStart.toISOString()} - ${targetDateEnd.toISOString()}`);

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        dueDate: {
          gte: targetDateStart,
          lt: targetDateEnd, // end date inclusive
        },
      },
      include: {
        user: true, // Include user relation to get email
      },
    });

    // Log the number of notifications found
    console.log(`Notifications found: ${notifications.length}`);

    // Log raw notifications for today for debugging
    const rawNotifications = await prisma.notification.findMany({
      where: {
        dueDate: {
          gte: new Date(Date.UTC(year, month - 1, day)),
        },
      },
    });
    console.log(`Raw Notifications for ${day}/${month}/${year}:`, rawNotifications);

    const emailPromises = notifications.map(async (notification) => {
      // Log detailed information about each notification
      console.log(`Preparing to send email to: ${notification.user.email}, Title: ${notification.title}, Message: ${notification.message}`);

      const params = {
        Destination: {
          ToAddresses: [notification.user.email],
        },
        Message: {
          Body: {
            Text: {
              Data: `${notification.message}. \nLog into https://app.ThePurplePiggybank.com to view your bill details. \nWarm Regards,\nThe Purple Piggy Bank`,
            },
          },
          Subject: {
            Data: notification.title,
          },
        },
        Source: `noreply@app.thepurplepiggybank.com`,
      };

      const command = new SendEmailCommand(params);
      return sesClient.send(command);
    });

    await Promise.all(emailPromises);

    console.log(`Emails processed for ${targetDay}/${month}/${year}`);
  } catch (error) {
    console.error("Error sending notifications:", error);
  } finally {
    await prisma.$disconnect();
  }
};
