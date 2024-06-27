const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken',
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    const nestedPayload = JSON.parse(payload.body);

    return nestedPayload;
}

async function getTransactionDetails(authToken, transactionId) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    if (!userId) {
        throw new Error('Invalid authorization token');
    }

    console.log('Querying transaction with ID:', transactionId);

    const transaction = await prisma.transaction.findUnique({
        where: { transactionId: transactionId },  // Corrected to use the Transaction table
        include: {
            ledger: true,  // Include related ledger details if needed
        },
    });

    console.log('Transaction query result:', transaction);

    if (!transaction) {
        return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Transaction not found' }),
        };
    }

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ transaction }),
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        const body = JSON.parse(event.body);
        console.log('Parsed body:', body);
        const authToken = body.authToken;
        const transactionId = body.transactionId;

        if (!authToken) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Authorization token is missing' }),
            };
        }

        if (!transactionId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'transactionId is missing' }),
            };
        }

        const response = await getTransactionDetails(authToken, transactionId);

        return response;
    } catch (error) {
        console.error("Error:", error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: false,
                message: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
