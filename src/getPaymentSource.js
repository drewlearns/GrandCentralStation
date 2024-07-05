const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { TextDecoder } = require('util');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: JSON.stringify({ authToken: token }),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log('Token verification result:', JSON.stringify(result, null, 2)); // Log the result

    if (result.errorMessage) {
        throw new Error(result.errorMessage);
    }

    const payload = JSON.parse(result.body); // Parse the body to get the actual payload

    return payload;
}

async function getDefaultPaymentSource(householdId) {
    const preference = await prisma.preferences.findFirst({
        where: {
            householdId: householdId,
            preferenceType: 'defaultPaymentSource',
        },
    });

    return preference ? preference.preferenceValue : null;
}

async function getPaymentSources(authToken, householdId) {
    const payload = await verifyToken(authToken);
    if (!payload.user_id) {
        throw new Error('Invalid token payload: missing uid');
    }

    const defaultPaymentSourceId = await getDefaultPaymentSource(householdId);
    const paymentSources = await prisma.paymentSource.findMany({
        where: { householdId },
        select: { sourceId: true, sourceName: true },
    });

    const results = {
        paymentSourceIds: [],
        paymentSourceNames: [],
        runningTotals: [],
        isDefault: [],
    };

    for (const source of paymentSources) {
        const latestLedger = await prisma.ledger.findFirst({
            where: {
                paymentSourceId: source.sourceId,
                transactionDate: { lte: new Date() },
            },
            orderBy: { transactionDate: 'desc' },
            select: { runningTotal: true },
        });

        const runningTotal = latestLedger ? parseFloat(latestLedger.runningTotal) : 0.0; // Use 0.0 as a default value

        results.paymentSourceIds.push(source.sourceId);
        results.paymentSourceNames.push(source.sourceName);
        results.runningTotals.push(runningTotal);
        results.isDefault.push(source.sourceId === defaultPaymentSourceId);
    }

    if ([results.paymentSourceIds.length, results.paymentSourceNames.length, results.runningTotals.length, results.isDefault.length].some(len => len !== results.paymentSourceIds.length)) {
        console.error('Mismatch in array lengths', results);
        throw new Error('Internal server error due to data mismatch');
    }

    return results;
}


exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const body = JSON.parse(event.body);
    const authToken = body.authToken;
    const householdId = body.householdId;

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
            body: JSON.stringify({ error: 'Household ID is missing' }),
        };
    }

    try {
        const paymentSources = await getPaymentSources(authToken, householdId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(paymentSources),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
