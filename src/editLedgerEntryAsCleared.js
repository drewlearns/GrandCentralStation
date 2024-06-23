const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

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

async function editLedgerEntryAsCleared(authToken, ledgerId) {
    // Verify the token
    const isValid = await verifyToken(authToken);
    if (!isValid) {
        throw new Error('Invalid authorization token');
    }

    // Retrieve the existing ledger entry
    const existingLedgerEntry = await prisma.ledger.findUnique({
        where: { ledgerId },
    });

    if (!existingLedgerEntry) {
        throw new Error('Ledger entry not found');
    }

    // Update the ledger entry's status to cleared (true)
    const updatedLedgerEntry = await prisma.ledger.update({
        where: { ledgerId },
        data: {
            status: true,
            updatedAt: new Date(),
        },
    });

    return updatedLedgerEntry;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const authToken = event.headers.Authorization || event.headers.authorization;
    const { ledgerId } = JSON.parse(event.body);

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
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
        const updatedLedgerEntry = await editLedgerEntryAsCleared(authToken, ledgerId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Ledger entry updated successfully',
                ledgerEntry: updatedLedgerEntry,
            }),
        };
    } catch (error) {
        console.error('Error updating ledger entry:', error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
