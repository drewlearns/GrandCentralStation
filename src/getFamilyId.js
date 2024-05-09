const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME; // Ensure this is set in the Lambda environment variables

exports.handler = async (event) => {
    const { userId } = JSON.parse(event.body); // Expecting 'userId' in the request body

    try {
        // Query for family members based on the given userId
        const queryParams = {
            TableName: TABLE_NAME,
            IndexName: "UserIdIndex", // Ensure 'UserIdIndex' exists where userId is a key attribute
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": `USER#${userId}`
            }
        };

        const { Items } = await docClient.send(new QueryCommand(queryParams));

        if (Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'No family found for the given user ID',
                }),
            };
        }

        console.log("Items found:", Items); // Debug log to inspect what is retrieved

        // Filter and map to extract all family IDs
        const familyIds = Items.filter(item => item.PK.startsWith("FAMILY#"))
                               .map(item => item.PK.split('FAMILY#')[1]);

        if (familyIds.length === 0) {
            console.error('No family items found for user:', userId);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'No families found for the given user ID.',
                }),
            };
        }

        console.log("Family IDs found:", familyIds);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Families found successfully',
                familyIds: familyIds
            }),
        };
    } catch (error) {
        console.error('Error searching for family by user ID:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error searching for families',
                error: error.message,
            }),
        };
    }
};
