const { PrismaClient } = require("@prisma/client");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const prisma = new PrismaClient();
const sesClient = new SESClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const now = new Date();
  const day = now.getUTCDate();
  const month = now.getUTCMonth() + 1; // getUTCMonth() is zero-indexed
  const year = now.getUTCFullYear();

  // Determine the target day, handling special cases
  const targetDay = day > 28 ? 28 : day;

  const targetDate = new Date(Date.UTC(year, month - 1, targetDay)); // target date in UTC

  // Log the target date
  console.log(`Target Date: ${targetDate.toISOString()}`);

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        dueDate: targetDate,
      },
      include: {
        user: true, // Include user relation to get email
      },
    });

    // Log the number of notifications found
    console.log(`Notifications found: ${notifications.length}`);

    for (const notification of notifications) {
      // Log detailed information about each notification
      console.log(`Preparing to send email to: ${notification.user.email}, Title: ${notification.title}, Message: ${notification.message}`);

      const params = {
        Destination: {
          ToAddresses: [notification.user.email],
        },
        Message: {
          Body: {
            Text: {
              Data: notification.message,
            },
          },
          Subject: {
            Data: notification.title,
          },
        },
        Source: `noreply@${process.env.TPPB_DOMAIN}`,
      };

      const command = new SendEmailCommand(params);
      await sesClient.send(command);

      // Log success
      console.log(`Email sent to: ${notification.user.email}`);
    }

    console.log(`Emails processed for ${targetDay}/${month}/${year}`);
  } catch (error) {
    console.error("Error sending notifications:", error);
  } finally {
    await prisma.$disconnect();
  }
};
