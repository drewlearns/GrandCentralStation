import { PrismaClient } from '@prisma/client';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

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

    const token = event.headers.Authorization || event.headers.authorization;
    const { email, mailOptIn, firstName, lastName } = JSON.parse(event.body);

    if (!token) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
        };
    }

    try {
        // Verify the token
        const isValid = await verifyToken(token);
        if (!isValid) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Unauthorized: Invalid token' }),
            };
        }

        // Decode the token to get the UUID
        const decoded = JSON.parse(new TextDecoder().decode(Buffer.from(token.split('.')[1], 'base64')));
        const uuid = decoded.uuid; // Assuming the token contains the user's UUID

        // Check if the user exists
        const existingUser = await prisma.user.findUnique({
            where: { uuid }
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
            where: { uuid },
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
    }
};
