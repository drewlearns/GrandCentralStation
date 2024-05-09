const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME; // Ensure this is set in the Lambda environment variables
const USER_INDEX_NAME = process.env.USER_INDEX_NAME; // Ensure this is set for the GSI on the 'userId' or 'createdBy' attribute

exports.handler = async (event) => {
    const { userId } = JSON.parse(event.body); // Expecting 'userId' in the request body

    try {
        const queryParams = {
            TableName: TABLE_NAME,
            IndexName: USER_INDEX_NAME,
            KeyConditionExpression: 'createdBy = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };

        const { Items } = await docClient.send(new QueryCommand(queryParams));

        if (Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Family not found for the given user ID',
                }),
            };
        }

        // Assuming each user belongs to one family for simplicity; adjust as needed
        const family = Items[0];

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Family found successfully',
                familyId: family.PK.replace('FAMILY#', ''),
                familyName: family.familyName,
                members: family.members
            }),
        };
    } catch (error) {
        console.error('Error finding family by user ID:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error finding family',
                error: error.message,
            }),
        };
    }
};
