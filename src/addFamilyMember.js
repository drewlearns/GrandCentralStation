// Import AWS SDK v3 packages
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Document Client
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = "family_table";

exports.handler = async (event) => {
    const { familyId, memberId, memberName, role } = JSON.parse(event.body);

    try {
        const item = {
            familyId: familyId,
            memberId: memberId,
            memberName: memberName,
            role: role,
            addedAt: new Date().toISOString(),
        };

        // Create a PutCommand to add an item to the DynamoDB table
        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        });

        // Execute the PutCommand using the Document Client
        await docClient.send(command);

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Family member added successfully',
                familyId: familyId,
                memberId: memberId,
            }),
        };
    } catch (error) {
        console.error('Error adding family member:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error adding family member',
                error: error.message,
            }),
        };
    }
};
