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

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        dueDate: targetDate,
      },
    });

    for (const notification of notifications) {
      const params = {
        Destination: {
          ToAddresses: [notification.recipientEmail],
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
    }

    console.log(`Emails sent for ${targetDay}/${month}/${year}`);
  } catch (error) {
    console.error("Error sending notifications:", error);
  } finally {
    await prisma.$disconnect();
  }
};
