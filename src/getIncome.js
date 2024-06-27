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

async function getIncomeDetails(authToken, incomeId) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    if (!userId) {
        throw new Error('Invalid authorization token');
    }

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
        return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: `Income with ID ${incomeId} not found` }),
        };
    }

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(income),
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
        const incomeId = body.incomeId;

        if (!authToken) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Authorization token is missing' }),
            };
        }

        if (!incomeId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'incomeId is missing' }),
            };
        }

        const response = await getIncomeDetails(authToken, incomeId);

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
