const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME; // Ensure this is set in the Lambda environment variables

exports.handler = async (event) => {
    const { familyId, newMember } = JSON.parse(event.body); // Expecting 'familyId' and 'newMember' in the request body

    try {
        // Check if the new member already exists
        const memberCheckParams = {
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk and SK = :sk",
            ExpressionAttributeValues: {
                ":pk": `FAMILY#${familyId}`,
                ":sk": `MEMBER#${newMember}`
            }
        };

        const { Items: existingMembers } = await docClient.send(new QueryCommand(memberCheckParams));

        if (existingMembers.length > 0) {
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Member already exists in the family',
                }),
            };
        }

        // Add the new member as a separate item
        const memberParams = {
            TableName: TABLE_NAME,
            Item: {
                PK: `FAMILY#${familyId}`,
                SK: `MEMBER#${newMember}`,
                userId: `USER#${newMember}`,
                role: "member" // Set roles as needed
            }
        };

        await docClient.send(new PutCommand(memberParams));

        // Retrieve the current list of members for updating the family overview
        const getFamilyParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `FAMILY#${familyId}`,
                SK: `FAMILY#${familyId}`
            }
        };

        const { Item: familyItem } = await docClient.send(new GetCommand(getFamilyParams));

        if (!familyItem) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Family not found',
                }),
            };
        }

        const updatedMembers = familyItem.members ? [...familyItem.members, newMember] : [newMember];

        // Update the family overview item with new members list using list_append
        const familyUpdateParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `FAMILY#${familyId}`,
                SK: `FAMILY#${familyId}`
            },
            UpdateExpression: 'SET members = list_append(members, :newMembers)',
            ExpressionAttributeValues: {
                ':newMembers': [newMember]
            }
        };

        // Perform the update
        await docClient.send(new UpdateCommand(familyUpdateParams));

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Family member added successfully',
                familyId: familyId
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
