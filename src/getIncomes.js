const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

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

async function getIncomes(authToken) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    if (!userId) {
        throw new Error('Invalid authorization token');
    }

    // Find the household(s) associated with the user
    const householdMembers = await prisma.householdMembers.findMany({
        where: {
            memberUuid: userId,
        },
        select: {
            householdId: true,
        },
    });

    if (householdMembers.length === 0) {
        return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'No households found for user' }),
        };
    }

    // Get all household IDs associated with the user
    const householdIds = householdMembers.map(hm => hm.householdId);

    // Find all incomes associated with these households
    const incomes = await prisma.incomes.findMany({
        where: {
            householdId: { in: householdIds },
        },
        select: {
            incomeId: true,
            householdId: true,
            name: true,
            amount: true,
            frequency: true,
            firstPayDay: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    // Convert the amount to float
    const incomesWithFloatAmount = incomes.map(income => ({
        ...income,
        amount: parseFloat(income.amount),
    }));

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(incomesWithFloatAmount),
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

        if (!authToken) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Authorization token is missing' }),
            };
        }

        const response = await getIncomes(authToken);

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
