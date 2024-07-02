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

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const { authToken, email, mailOptIn, firstName, lastName } = JSON.parse(event.body);

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
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

        // Check if the user exists
        const existingUser = await prisma.user.findUnique({
            where: { uuid: userId }
        });

        if (!existingUser) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'User not found' }),
            };
        }

        // Update user details
        const updatedUser = await prisma.user.update({
            where: { uuid: userId },
            data: {
                email,
                firstName,
                lastName,
                mailOptIn,
                updatedAt: new Date(),
            },
        });

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'User updated successfully',
                user: updatedUser,
            }),
        };

    } catch (error) {
        console.error('Error updating user:', error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
