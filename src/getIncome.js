const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary

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

    return payload;
}

async function getIncomeDetails(authToken, incomeId) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.uid;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

    // Fetch income details
    const income = await prisma.incomes.findUnique({
        where: {
            incomeId: incomeId,
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

    if (!income) {
        throw new Error(`Income with ID ${incomeId} not found`);
    }

    return income;
}

exports.handler = async (event) => {
    const authToken = event.headers.Authorization;
    const incomeId = event.pathParameters.incomeId;

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET',
    };

    if (!authToken) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!incomeId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'incomeId is missing' }),
        };
    }

    try {
        const income = await getIncomeDetails(authToken, incomeId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(income),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
