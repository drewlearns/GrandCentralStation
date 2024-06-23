const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,DELETE'
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

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const { authToken, ledgerId, householdId } = JSON.parse(event.body);

    // Verify the token
    const isValid = await verifyToken(authToken);
    if (!isValid) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid authorization token' }),
        };
    }

    try {
        // Fetch the ledger entry to be deleted
        const ledgerEntry = await prisma.ledger.findUnique({
            where: { ledgerId: ledgerId },
        });

        if (!ledgerEntry || ledgerEntry.householdId !== householdId) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Ledger entry not found or does not belong to the specified household',
                }),
            };
        }

        // Delete the ledger entry
        await prisma.ledger.delete({
            where: { ledgerId: ledgerId },
        });

        // Invoke calculateRunningTotal Lambda function
        await invokeCalculateRunningTotal(householdId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Ledger entry deleted successfully',
                ledgerId: ledgerId,
            }),
        };
    } catch (error) {
        console.error('Error deleting ledger entry:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error deleting ledger entry',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};

// Example usage:
// const authToken = 'your-auth-token';
// const ledgerId = 'your-ledger-id';
// const householdId = 'your-household-id';

// deleteLedgerEntry(authToken, ledgerId, householdId)
//     .then(response => console.log(response))
//     .catch(error => console.error('Error deleting ledger entry:', error));
