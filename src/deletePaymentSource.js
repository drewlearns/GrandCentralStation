const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { TextDecoder } = require('util');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const body = JSON.parse(event.body);
    const authToken = body.authToken;
    const sourceId = body.sourceId;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!sourceId) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Source ID is missing' }),
        };
    }

    let userId;

    try {
        // Verify the token
        const nestedPayload = await verifyToken(authToken);
        userId = nestedPayload.user_id;
        console.log('Verified user_id:', userId);

        if (!userId) {
            throw new Error('User ID is undefined after token verification');
        }

        // Fetch the payment source by ID
        const paymentSource = await prisma.paymentSource.findUnique({
            where: { sourceId: sourceId },
            select: {
                sourceId: true,
                sourceName: true,
                sourceType: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                householdId: true
            },
        });

        if (!paymentSource) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Payment source not found' }),
            };
        }

        // Check if the user is a member of the household
        const householdMember = await prisma.householdMembers.findFirst({
            where: {
                householdId: paymentSource.householdId,
                memberUuid: userId,
            },
        });

        if (!householdMember) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Unauthorized' }),
            };
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(paymentSource),
        };
    } catch (error) {
        console.error('Error fetching payment source:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error', message: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
