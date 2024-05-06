const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { familyId } = event.pathParameters;
    const { ledgerName, createdBy } = JSON.parse(event.body);

    const ledgerId = AWS.util.uuid.v4();  // Generate a unique ledger ID

    try {
        const params = {
            TableName: TABLE_NAME,
            Item: {
                PK: `FAMILY#${familyId}`,  // Partition key
                SK: `LEDGER#${ledgerId}`,  // Sort key
                ledgerId: ledgerId,
                ledgerName: ledgerName,
                createdBy: createdBy,
                createdAt: new Date().toISOString(),
                familyId: familyId
            }
        };

        // Execute the PutCommand to add the new ledger to DynamoDB
        await docClient.send(new PutCommand(params));

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Ledger created successfully',
                ledgerId: ledgerId,
                ledgerName: ledgerName,
                familyId: familyId
            }),
        };
    } catch (error) {
        console.error('Error creating ledger:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to create ledger',
                error: error.message
            }),
        };
    }
};
