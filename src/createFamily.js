const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME; // Ensure this is set in the Lambda environment variables

exports.handler = async (event) => {
    const { familyName, createdBy } = JSON.parse(event.body); // Expecting 'familyName' and 'createdBy' in the request body

    const familyId = AWS.util.uuid.v4(); // Generates a unique UUID for each new family

    try {
        const params = {
            TableName: TABLE_NAME,
            Item: {
                familyId: familyId,
                familyName: familyName,
                createdBy: createdBy,
                createdAt: new Date().toISOString()
            }
        };

        // Put the new family into the DynamoDB table
        await dynamoDB.put(params).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Family created successfully',
                familyId: familyId,
                familyName: familyName,
                createdBy: createdBy
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
