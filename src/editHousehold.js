const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,PUT',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log("verifyToken response payload:", payload);

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    const nestedPayload = JSON.parse(payload.body);

    console.log("verifyToken nested payload:", nestedPayload);

    return nestedPayload;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(event.body);
        console.log('Parsed request body:', parsedBody);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { authToken, householdId, householdData } = parsedBody;

    // Validate required fields
    if (!authToken || !householdId || !householdData || !householdData.householdName) {
        console.error('Missing required fields', { authToken, householdId, householdData });
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Missing required fields' }),
        };
    }

    try {
        // Verify the token
        const user = await verifyToken(authToken);
        if (!user) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invalid authorization token' }),
            };
        }

        // Update the household
        const updatedHousehold = await prisma.household.update({
            where: { householdId },
            data: {
                householdName: householdData.householdName,
                updatedAt: new Date(),
            },
        });
        console.log('Household updated:', updatedHousehold);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(updatedHousehold),
        };
    } catch (error) {
        console.error('Error updating household:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Error updating household', error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};

// Example event payload
/*
{
    "authToken": "your-auth-token",
    "householdId": "household-id-to-edit",
    "householdData": {
        "householdName": "Updated Household Name"
    }
}
*/
