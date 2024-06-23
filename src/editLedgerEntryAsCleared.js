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
    console.log('Verifying token...');
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: JSON.stringify({ authToken: token }),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    console.log('Token verification response:', JSON.stringify(response, null, 2));

    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log('Token verification result:', JSON.stringify(result, null, 2));

    if (result.errorMessage) {
        throw new Error(result.errorMessage);
    }

    const payload = JSON.parse(result.body); // Parse the body to get the actual payload
    console.log('Token payload:', JSON.stringify(payload, null, 2));

    return payload;
}

async function editLedgerEntryAsCleared(authToken, ledgerId) {
    console.log('Editing ledger entry as cleared...');
    // Verify the token
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;
    if (!userId) {
        throw new Error('Invalid authorization token');
    }

    console.log('User ID from token:', userId);

    // Retrieve the existing ledger entry
    const existingLedgerEntry = await prisma.ledger.findUnique({
        where: { ledgerId },
    });

    if (!existingLedgerEntry) {
        throw new Error('Ledger entry not found');
    }

    console.log('Existing ledger entry:', JSON.stringify(existingLedgerEntry, null, 2));

    // Toggle the ledger entry's status
    const newStatus = !existingLedgerEntry.status;

    // Update the ledger entry's status
    const updatedLedgerEntry = await prisma.ledger.update({
        where: { ledgerId },
        data: {
            status: newStatus,
            updatedAt: new Date(),
        },
    });

    console.log('Updated ledger entry:', JSON.stringify(updatedLedgerEntry, null, 2));

    return updatedLedgerEntry;
}

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let authToken;
    let ledgerId;
    try {
        const body = JSON.parse(event.body);
        authToken = body.authToken;
        ledgerId = body.ledgerId;
    } catch (error) {
        console.error('Invalid request body:', error);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    console.log('Auth Token:', authToken);
    console.log('Ledger ID:', ledgerId);

    if (!authToken) {
        console.error('Unauthorized: No token provided');
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
        };
    }

    if (!ledgerId) {
        console.error('Ledger ID is missing');
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'ledgerId is missing' }),
        };
    }

    try {
        const updatedLedgerEntry = await editLedgerEntryAsCleared(authToken, ledgerId);
        console.log('Successfully updated ledger entry:', JSON.stringify(updatedLedgerEntry, null, 2));
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
