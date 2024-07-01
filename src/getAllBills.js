const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
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

    // Log the initial payload for debugging
    console.log("verifyToken response payload:", payload);

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    // Parse the nested JSON body
    const nestedPayload = JSON.parse(payload.body);

    // Log the nested payload for debugging
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

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        console.error("Error parsing JSON body:", error);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid JSON body' }),
        };
    }

    const { authToken, householdId } = body;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!householdId) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'householdId is missing' }),
        };
    }

    // Verify the token
    let userId;
    try {
        const payload = await verifyToken(authToken);
        userId = payload.user_id;
        if (!userId) {
            throw new Error('Invalid authorization token: No user ID found in token.');
        }
    } catch (error) {
        console.error("Error verifying token:", error);
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid authorization token' }),
        };
    }

    // Validate user and household association (optional)
    // Here we assume the user is already validated for simplicity

    try {
        const bills = await prisma.bill.findMany({
            where: { householdId },
            select: {
                billId: true,
                billName: true,
            },
        });

        if (bills.length === 0) {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'No bills found for the given household.' }),
            };
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Successfully found bills.',
                bills,
            }),
        };
    } catch (error) {
        console.error("Error fetching bills:", error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
