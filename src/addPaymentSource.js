const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
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
            headers: corsHeaders,
        };
    }

    const { authToken, householdId, name, type } = JSON.parse(event.body);

    if (!authToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Access denied. No token provided.' }),
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

        // Create the new payment source
        const newPaymentSource = await prisma.paymentSource.create({
            data: {
                householdId: householdId,
                sourceName: name,
                sourceType: type,
                description: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        console.log(JSON.stringify({ paymentSourceId: newPaymentSource.sourceId }))
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ paymentSourceId: newPaymentSource.sourceId }),
        };
    } catch (error) {
        console.error('Error adding payment source:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
