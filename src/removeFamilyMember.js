const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { familyId, userId } = event.pathParameters;

    try {
        const params = {
            TableName: TABLE_NAME,
            Key: {
                familyId: familyId,
                memberId: userId
            }
        };

        // Execute the delete operation on DynamoDB
        await docClient.send(new DeleteCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Family member removed successfully'
            }),
        };
    } catch (error) {
        console.error('Error removing family member:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to remove family member',
                error: error.message
            }),
        };
    }
};
