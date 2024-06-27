const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

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

async function getPaymentSources(authToken, householdId) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.user_id;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

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

    // Separate the payment sources into two arrays and initialize running totals
    const paymentSourceIDs = [];
    const paymentSourceNames = [];
    const runningTotals = [];

    for (const source of paymentSources) {
        paymentSourceIDs.push(source.sourceId);
        paymentSourceNames.push(source.sourceName);

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

        // Store the running total as a float or null if no entries found
        runningTotals.push(latestLedger ? parseFloat(latestLedger.runningTotal) : null);
    }

    return { paymentSourceIDs, paymentSourceNames, runningTotals };
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
