const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME; // Ensure this is set in the Lambda environment variables

exports.handler = async (event) => {
    const { familyName, createdBy } = JSON.parse(event.body); // Expecting 'familyName' and 'createdBy' in the request body

    const familyId = uuidv4(); // Generates a unique UUID for each new family

    try {
        // Prepare a batch write to create the family and the creator's member entry
        const batchParams = {
            RequestItems: {
                [TABLE_NAME]: [
                    {
                        PutRequest: {
                            Item: {
                                PK: `FAMILY#${familyId}`, // Unique identifier for the family
                                SK: `FAMILY#${familyId}`, // Same SK to indicate this is the family entry
                                familyName: familyName,
                                createdAt: new Date().toISOString(),
                                members: [createdBy] // List members here for quick overview; detailed in member entries
                            }
                        }
                    },
                    {
                        PutRequest: {
                            Item: {
                                PK: `FAMILY#${familyId}`,
                                SK: `MEMBER#${createdBy}`, // Unique identifier for each member
                                role: "creator",
                                userId: `USER#${createdBy}`
                            }
                        }
                    }
                ]
            }
        };

        // Execute the batch write to insert both the family and its creator
        await docClient.send(new BatchWriteCommand(batchParams));

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
