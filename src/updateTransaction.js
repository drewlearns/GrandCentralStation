const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { transactionId } = event.pathParameters;
    const { amount, description, date } = JSON.parse(event.body);  // Attributes to be updated

    try {
        const updateParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `TRANSACTION#${transactionId}`,  // Assuming the partition key is the transactionId prefixed
                SK: `TRANSACTION#${transactionId}`  // Assuming the sort key is also the transactionId prefixed
            },
            UpdateExpression: "set amount = :a, description = :d, date = :dt",
            ExpressionAttributeValues: {
                ":a": amount,
                ":d": description,
                ":dt": date
            },
            ReturnValues: "UPDATED_NEW"
        };

        // Execute the UpdateCommand to update the transaction in DynamoDB
        const result = await docClient.send(new UpdateCommand(updateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Transaction updated successfully',
                updatedAttributes: result.Attributes
            }),
        };
    } catch (error) {
        console.error('Error updating transaction:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to update transaction',
                error: error.message
            }),
        };
    }
};
