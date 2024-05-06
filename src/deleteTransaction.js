const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { transactionId } = event.pathParameters;

    try {
        const deleteParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `TRANSACTION#${transactionId}`,  // Partition key assumed as transactionId prefixed
                SK: `TRANSACTION#${transactionId}`  // Sort key assumed as transactionId prefixed
            }
        };

        // Execute the DeleteCommand to remove the transaction from DynamoDB
        await docClient.send(new DeleteCommand(deleteParams));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Transaction deleted successfully'
            }),
        };
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to delete transaction',
                error: error.message
            }),
        };
    }
};
