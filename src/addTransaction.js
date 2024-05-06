const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { ledgerId } = event.pathParameters;
    const { transactionId, amount, description, date } = JSON.parse(event.body);

    try {
        const params = {
            TableName: TABLE_NAME,
            Item: {
                PK: `LEDGER#${ledgerId}`,  // Partition key
                SK: `TRANSACTION#${transactionId}`,  // Sort key
                transactionId: transactionId,
                amount: amount,
                description: description,
                date: date,
                createdAt: new Date().toISOString()
            }
        };

        // Execute the PutCommand to add the new transaction to DynamoDB
        await docClient.send(new PutCommand(params));

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Transaction added successfully',
                transactionId: transactionId,
                ledgerId: ledgerId
            }),
        };
    } catch (error) {
        console.error('Error adding transaction:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to add transaction',
                error: error.message
            }),
        };
    }
};
