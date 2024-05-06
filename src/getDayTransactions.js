const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { date } = event.pathParameters; // Expecting the date in YYYY-MM-DD format

    try {
        const params = {
            TableName: TABLE_NAME,
            IndexName: "DateIndex", // Ensure this secondary index is set up in DynamoDB
            KeyConditionExpression: "#date = :dateVal",
            ExpressionAttributeNames: {
                "#date": "date"
            },
            ExpressionAttributeValues: {
                ":dateVal": date
            }
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully retrieved transactions',
                transactions: Items
            }),
        };
    } catch (error) {
        console.error('Error retrieving transactions:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to retrieve transactions',
                error: error.message
            }),
        };
    }
};
