const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { familyId } = event.pathParameters;

    try {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `FAMILY#${familyId}`
            }
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully retrieved ledgers',
                ledgers: Items
            }),
        };
    } catch (error) {
        console.error('Error retrieving ledgers:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to retrieve ledgers',
                error: error.message
            }),
        };
    }
};
