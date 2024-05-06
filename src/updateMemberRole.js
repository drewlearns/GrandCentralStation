// Import AWS SDK v3 packages for DynamoDB
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Document Client
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { familyId, userId } = event.pathParameters;  // Extracting path parameters
    const { newRole } = JSON.parse(event.body);         // Expecting 'newRole' in the request body

    try {
        const updateParams = {
            TableName: TABLE_NAME,
            Key: {
                familyId: familyId,
                memberId: userId
            },
            UpdateExpression: "set role = :r",
            ExpressionAttributeValues: {
                ":r": newRole
            },
            ReturnValues: "UPDATED_NEW"
        };

        // Create an UpdateCommand to update an item in the DynamoDB table
        const command = new UpdateCommand(updateParams);

        // Execute the UpdateCommand using the Document Client
        const result = await docClient.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Family member role updated successfully',
                updatedAttributes: result.Attributes
            }),
        };
    } catch (error) {
        console.error('Error updating family member role:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error updating family member role',
                error: error.message,
            }),
        };
    }
};
