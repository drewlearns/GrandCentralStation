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

function getStartOfDay() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log('Computed start of day:', startOfDay);
    return startOfDay;
}

async function getNotifications(authToken) {
    const startOfDay = getStartOfDay();

    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.user_id;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

    console.log('Verified user ID:', uid);

    // Fetch notifications that are due in the future, sorted by due date
    const notifications = await prisma.notification.findMany({
        where: {
            userUuid: uid,
            dueDate: {
                gte: startOfDay,
            },
        },
        orderBy: {
            dueDate: 'asc',
        },
    });

    console.log('Fetched notifications:', notifications);

    return notifications;
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

    const authToken = body.authToken;

    if (!authToken) {
        console.error('Authorization token is missing');
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    try {
        const notifications = await getNotifications(authToken);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(notifications),
        };
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
