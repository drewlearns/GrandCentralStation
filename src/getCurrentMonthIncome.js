const { Decimal } = require('decimal.js');
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

    return payload.isValid;
}

async function getCurrentMonthIncome(authToken, householdId) {
    // Verify the token
    const isValid = await verifyToken(authToken);
    if (!isValid) {
        throw new Error('Invalid authorization token');
    }

    // Get the current date
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Fetch income for the current month
    const incomeEntries = await prisma.ledger.findMany({
        where: {
            householdId,
            incomeId: {
                not: null,
            },
            transactionDate: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
        },
        select: {
            amount: true,
        },
    });

    // Calculate the total income
    const totalIncome = incomeEntries.reduce((sum, entry) => {
        return sum.plus(new Decimal(entry.amount));
    }, new Decimal(0));

    // Format the result
    return {
        totalIncome: totalIncome.toFixed(2),
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const authToken = event.headers.Authorization;
    const householdId = event.pathParameters.householdId;

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
            body: JSON.stringify({ error: 'householdId is missing' }),
        };
    }

    try {
        const income = await getCurrentMonthIncome(authToken, householdId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(income),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
