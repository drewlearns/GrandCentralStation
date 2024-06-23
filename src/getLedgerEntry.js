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
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload;
}

async function getLedgerEntry(authToken, ledgerId) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.uid;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

    // Fetch the ledger entry details
    const ledgerEntry = await prisma.ledger.findUnique({
        where: { ledgerId: ledgerId },
        include: {
            household: true,
            paymentSource: true,
            bill: true,
            income: true,
            attachments: true,
            transactions: true
        },
    });

    if (!ledgerEntry) {
        throw new Error('Ledger entry not found');
    }

    return ledgerEntry;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const authToken = event.headers.Authorization;
    const ledgerId = event.pathParameters.ledgerId;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!ledgerId) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'ledgerId is missing' }),
        };
    }

    try {
        const ledgerEntry = await getLedgerEntry(authToken, ledgerId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(ledgerEntry),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
