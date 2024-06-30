const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
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

    const { authToken, notificationId } = body;

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

        // Fetch the notification
        const notification = await prisma.notification.findUnique({
            where: { notificationId },
        });

        if (!notification) {
            console.error('Notification not found');
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Notification not found' }),
            };
        }

        console.log('Fetched notification:', notification);

        // Ensure the user requesting the notification is the owner
        if (notification.userUuid !== userUuid) {
            console.error('User is not authorized to access this notification');
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'User is not authorized to access this notification' }),
            };
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(notification),
        };
    } catch (error) {
        console.error('Error fetching notification:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
