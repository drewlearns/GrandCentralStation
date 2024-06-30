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
    const preference = await prisma.preferences.findUnique({
        where: {
            householdId_preferenceType: {
                householdId: householdId,
                preferenceType: 'defaultPaymentSource',
            },
        },
    });

    return preference ? preference.preferenceValue : null;
}

async function getPaymentSources(authToken, householdId) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.user_id;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

    // Fetch the default payment source for the household
    const defaultPaymentSourceId = await getDefaultPaymentSource(householdId);

    // Fetch payment sources associated with the householdId
    const paymentSources = await prisma.paymentSource.findMany({
        where: {
            householdId: householdId,
        },
        select: {
            sourceId: true,
            sourceName: true,
        },
    });

    const response = [];
    
    for (const source of paymentSources) {
        // Fetch the most recent ledger entry up to today's date for each payment source
        const latestLedger = await prisma.ledger.findFirst({
            where: {
                paymentSourceId: source.sourceId,
                transactionDate: {
                    lte: new Date(), // Up to today's date
                },
            },
            orderBy: {
                transactionDate: 'desc',
            },
            select: {
                runningTotal: true,
            },
        });

        const runningTotal = latestLedger ? parseFloat(latestLedger.runningTotal) : null;

        response.push({
            sourceId: source.sourceId,
            sourceName: source.sourceName,
            runningTotal: runningTotal,
            isDefault: source.sourceId === defaultPaymentSourceId,
        });
    }

    return response;
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
