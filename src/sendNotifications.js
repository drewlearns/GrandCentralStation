const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN; // SNS topic ARN where notifications will be sent

exports.handler = async (event) => {
    const { message, userIds } = JSON.parse(event.body); // Assuming a message and a list of user IDs are provided

    try {
        for (const userId of userIds) {
            const publishParams = {
                TopicArn: SNS_TOPIC_ARN,
                Message: message,
                MessageAttributes: {
                    'userId': {
                        DataType: 'String',
                        StringValue: userId
                    }
                }
            };

            // Send the notification message via SNS
            await snsClient.send(new PublishCommand(publishParams));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Notifications sent successfully',
                totalSent: userIds.length
            }),
        };
    } catch (error) {
        console.error('Error sending notifications:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to send notifications',
                error: error.message
            }),
        };
    }
};
