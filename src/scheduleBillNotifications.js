const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

exports.handler = async (event) => {
    // Scan DynamoDB for bills that are due soon
    const today = new Date();
    today.setDate(today.getDate() + 3); // Change the range according to the requirement
    const dueDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const scanParams = {
        TableName: TABLE_NAME,
        FilterExpression: "dueDate = :dueDate",
        ExpressionAttributeValues: {
            ":dueDate": dueDate
        }
    };

    try {
        const { Items } = await docClient.send(new ScanCommand(scanParams));

        for (const item of Items) {
            // Construct the notification message
            const message = `Reminder: Your bill for ${item.amount} is due on ${item.dueDate}.`;

            // Send notification via SNS
            const publishParams = {
                TopicArn: SNS_TOPIC_ARN,
                Message: message,
                Subject: "Bill Due Reminder"
            };

            await snsClient.send(new PublishCommand(publishParams));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Notifications scheduled successfully',
                count: Items.length
            }),
        };
    } catch (error) {
        console.error('Error scheduling notifications:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to schedule notifications',
                error: error.message
            }),
        };
    }
};
