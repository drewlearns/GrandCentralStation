const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,PUT',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken',
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
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing request body:', error.message);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid JSON format.' }),
        };
    }

    const { authToken, notificationId, title, message, dueDate } = body;

    if (!authToken) {
        console.error('Authorization token is missing');
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    try {
        // Verify the token
        const payload = await verifyToken(authToken);
        const userUuid = payload.user_id;

        if (!userUuid) {
            throw new Error('Invalid token payload: missing user ID');
        }

        console.log('Verified user ID:', userUuid);

        // Update the notification
        const updatedNotification = await prisma.notification.update({
            where: { notificationId },
            data: {
                userUuid,
                title,
                message,
                dueDate: new Date(dueDate),
                updatedAt: new Date(),
            },
        });

        console.log('Updated notification:', updatedNotification);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(updatedNotification),
        };
    } catch (error) {
        console.error('Error updating notification:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
