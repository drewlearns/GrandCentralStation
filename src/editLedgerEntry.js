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

async function invokeCalculateRunningTotal(householdId) {
    const params = {
        FunctionName: 'calculateRunningTotal', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({
            householdId: householdId,
            paymentSourceId: null // Adjust based on your actual payment source logic
        })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.statusCode !== 200) {
        throw new Error(`Error invoking calculateRunningTotal: ${payload.message}`);
    }

    return payload.message;
}

async function editLedgerEntry(authToken, ledgerId, updatedLedgerData) {
    const nestedPayload = await verifyToken(authToken);
    const userId = nestedPayload.user_id;
    console.log('Verified user_id:', userId);

    if (!userId) {
        throw new Error('User ID is undefined after token verification');
    }

    // Retrieve the existing ledger entry
    const existingLedgerEntry = await prisma.ledger.findUnique({
        where: { ledgerId },
    });

    if (!existingLedgerEntry) {
        throw new Error('Ledger entry not found');
    }

    // Update the ledger entry
    const updatedLedgerEntry = await prisma.ledger.update({
        where: { ledgerId },
        data: {
            transactionDate: new Date(updatedLedgerData.transactionDate),
            status: updatedLedgerData.status,
            description: updatedLedgerData.description,
            amount: updatedLedgerData.amount,
            category: updatedLedgerData.category,
            tags: updatedLedgerData.tags,
            householdId: updatedLedgerData.householdId,
            paymentSourceId: updatedLedgerData.paymentSourceId,
            transactionType: updatedLedgerData.transactionType,
            updatedAt: new Date(),
        },
    });

    // Invoke calculateRunningTotal Lambda function
    await invokeCalculateRunningTotal(existingLedgerEntry.householdId);

    return updatedLedgerEntry;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const { authToken, ledgerId, updatedLedgerData } = JSON.parse(event.body);

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
        };
    }

    if (!ledgerId || !updatedLedgerData) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'ledgerId or updatedLedgerData is missing' }),
        };
    }

    try {
        const updatedLedgerEntry = await editLedgerEntry(authToken, ledgerId, updatedLedgerData);
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
