const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME; // Ensure this is set in the Lambda environment variables

exports.handler = async (event) => {
    const { familyName, createdBy } = JSON.parse(event.body); // Expecting 'familyName' and 'createdBy' in the request body

    const familyId = uuidv4(); // Generates a unique UUID for each new family

    try {
        const params = {
            TableName: TABLE_NAME,
            Item: {
                PK: `FAMILY#${familyId}`, // Use PK to uniquely identify the family
                SK: `FAMILY#${familyId}`, // Use SK to relate the family to its creator
                userId: `USER#${createdBy}`,
                familyName: familyName,
                members: [createdBy],
                createdAt: new Date().toISOString()
            }
        };

        // Put the new family into the DynamoDB table
        await docClient.send(new PutCommand(params));

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Family created successfully',
                familyId: familyId,
                familyName: familyName,
            }),
        };
    } catch (error) {
        console.error('Error creating family:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error creating family',
                error: error.message,
            }),
        };
    }
};
