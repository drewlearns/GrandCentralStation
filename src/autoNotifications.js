import { PrismaClient } from '@prisma/client';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const prisma = new PrismaClient();
const snsClient = new SNSClient({ region: 'your-region' });

exports.handler = async (event) => {
    const today = new Date();
    const dayOfMonth = today.getDate();

    try {
        // Find bills due today
        const bills = await prisma.bill.findMany({
            where: {
                dayOfMonth: dayOfMonth
            },
            include: {
                notification: true,
                user: true
            }
        });

        // Trigger notifications
        for (const bill of bills) {
            if (bill.notification) {
                await sendPushNotification(bill.notification.title, bill.notification.message);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify('Notifications sent successfully')
        };
    } catch (error) {
        console.error('Error sending notifications:', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Error sending notifications')
        };
    }
};

async function sendPushNotification(title, message) {
    const params = {
        Message: JSON.stringify({
            default: message,
            APNS: JSON.stringify({
                aps: {
                    alert: {
                        title: title,
                        body: message
                    },
                    sound: 'default'
                }
            }),
            GCM: JSON.stringify({
                notification: {
                    title: title,
                    body: message,
                    sound: 'default'
                }
            })
        }),
        MessageStructure: 'json',
        TopicArn: 'arn:aws:sns:your-region:your-account-id:bill-notifications-topic'
    };

    const command = new PublishCommand(params);
    return snsClient.send(command);
}
