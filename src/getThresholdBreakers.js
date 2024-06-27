const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
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

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const body = JSON.parse(event.body);
    const authToken = body.authToken;
    const householdId = body.householdId;
    const threshold = body.threshold;
    const paymentSourceId = body.paymentSourceId;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Access denied. No authorization token provided.' }),
        };
    }

    let userId;

    // Verify the token
    try {
        const payload = await verifyToken(authToken);
        userId = payload.user_id;
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Invalid token.',
                error: error.message,
            }),
        };
    }

    if (!userId) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid token payload: missing user_id' }),
        };
    }

    if (!householdId || !threshold || !paymentSourceId) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Missing householdId, threshold, or paymentSourceId parameter',
            }),
        };
    }

    try {
        const currentDate = new Date();

        // Verify user is a member of the household
        const householdMember = await prisma.householdMembers.findFirst({
            where: {
                householdId: householdId,
                memberUuid: userId,
            },
        });

        if (!householdMember) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    message: 'Access denied. User is not a member of the specified household.',
                }),
            };
        }

        // Fetch ledger entries with running total for the specified paymentSourceId and future transactions only
        const ledgerEntries = await prisma.ledger.findMany({
            where: {
                householdId: householdId,
                paymentSourceId: paymentSourceId,
                transactionDate: {
                    gt: currentDate, // Only fetch transactions that haven't happened yet
                },
                status: false, // Only include entries where status is false
            },
            orderBy: { transactionDate: 'asc' },
            select: {
                ledgerId: true, // Select the ledgerId
                transactionDate: true,
                amount: true,
                runningTotal: true,
                description: true, // Fetching description directly from the Ledger table
            },
        });

        const entriesBelowThreshold = ledgerEntries.filter(
            (entry) => entry.runningTotal < threshold
        ).map(entry => ({
            ledgerId: entry.ledgerId, // Include ledgerId in the response
            transactionDate: entry.transactionDate,
            amount: parseFloat(entry.amount), // Ensure amount is returned as a float
            runningTotal: parseFloat(entry.runningTotal), // Ensure running total is returned as a float
            description: entry.description,
        }));

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ entries: entriesBelowThreshold }),
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Error processing request',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
