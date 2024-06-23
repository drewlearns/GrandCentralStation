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
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload.isValid;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const { authToken, householdId, householdData } = JSON.parse(event.body);

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Unauthorized: No token provided' }),
        };
    }

    try {
        // Verify the token
        const isValid = await verifyToken(authToken);
        if (!isValid) {
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

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(updatedHousehold),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: error.message }),
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
