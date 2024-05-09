const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME; // Ensure this is set in the Lambda environment variables

exports.handler = async (event) => {
    const { familyId, newMember } = JSON.parse(event.body); // Expecting 'familyId' and 'newMember' in the request body

    try {
        // Retrieve the current family record
        const getParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `FAMILY#${familyId}`,
                SK: `FAMILY#${familyId}` // Assuming SK is the same as PK for retrieving the family
            }
        };

        const { Item } = await docClient.send(new GetCommand(getParams));

        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Family not found',
                }),
            };
        }

        // Add the new member without duplicating it
        const updatedMembers = Item.members.includes(newMember) ? Item.members : [...Item.members, newMember];

        // Update the family record with the new member list
        const updateParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `FAMILY#${familyId}`,
                SK: `FAMILY#${familyId}`
            },
            UpdateExpression: 'SET members = :members',
            ExpressionAttributeValues: {
                ':members': updatedMembers
            }
        };

        await docClient.send(new UpdateCommand(updateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Family member added successfully',
                familyId: familyId,
                familyName: Item.familyName,
                createdBy: Item.createdBy,
                members: updatedMembers
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
