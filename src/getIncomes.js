const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { startOfMonth, endOfMonth } = require('date-fns'); // Add this line for date handling

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
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

async function getIncomes(authToken, householdId) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    if (!userId) {
        throw new Error('Invalid authorization token');
    }

    // Log userId
    console.log('User ID:', userId);

    // Check if the user is a member of the specified household
    const householdMember = await prisma.householdMembers.findFirst({
        where: {
            memberUuid: userId,
            householdId: householdId,
        },
        select: {
            householdId: true,
        },
    });

    // Log householdMember
    console.log('Household Member:', householdMember);

    if (!householdMember) {
        return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'User is not a member of the specified household' }),
        };
    }

    const startOfMonthDate = startOfMonth(new Date());
    const endOfMonthDate = endOfMonth(new Date());

    // Find all ledger entries for the current month associated with this household's incomes
    const ledgerEntries = await prisma.ledger.findMany({
        where: {
            householdId: householdId,
            transactionDate: {
                gte: startOfMonthDate,
                lte: endOfMonthDate,
            },
            incomeId: {
                not: null,
            },
        },
        orderBy: {
            transactionDate: 'asc', // Order by transactionDate in ascending order
        },
        select: {
            incomeId: true,  // Select incomeId
            transactionDate: true,
            amount: true,
            income: {
                select: {
                    name: true,
                },
            },
        },
    });

    // Log the ledger query result
    console.log('Ledger Query Result:', ledgerEntries);

    // Format the response
    const formattedEntries = ledgerEntries.map(entry => ({
        incomeId: entry.incomeId,  // Include incomeId in the response
        incomeName: entry.income.name,
        transactionDate: entry.transactionDate,
        amount: parseFloat(entry.amount),
    }));

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(formattedEntries),
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    try {
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

        const response = await getIncomes(authToken, householdId);

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
    }
};
