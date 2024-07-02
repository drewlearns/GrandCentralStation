const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

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

async function editPaymentSource(authToken, sourceId, name, type, description) {
    // Verify the token
    const nestedPayload = await verifyToken(authToken);
    const userId = nestedPayload.user_id;
    console.log('Verified user_id:', userId);

    if (!userId) {
        throw new Error('User ID is undefined after token verification');
    }

    // Update the payment source
    const updatedPaymentSource = await prisma.paymentSource.update({
        where: {
            sourceId: sourceId,
        },
        data: {
            sourceName: name,
            sourceType: type,
            description: description,
            updatedAt: new Date(),
        },
    });

    return updatedPaymentSource;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const { authToken, sourceId, name, type, description } = JSON.parse(event.body);

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
        };
    }

    try {
        const updatedPaymentSource = await editPaymentSource(authToken, sourceId, name, type, description);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Payment source updated successfully',
                paymentSource: updatedPaymentSource,
            }),
        };
    } catch (error) {
        console.error('Error updating payment source:', error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
