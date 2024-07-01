const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

async function verifyToken(token) {
    console.log("Verifying token:", token);
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    try {
        const command = new InvokeCommand(params);
        const response = await lambda.send(command);
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));

        console.log("verifyToken response payload:", payload);

        if (payload.errorMessage) {
            throw new Error(payload.errorMessage);
        }

        const nestedPayload = JSON.parse(payload.body);

        console.log("verifyToken nested payload:", nestedPayload);

        return nestedPayload;
    } catch (error) {
        console.error("Error verifying token:", error);
        throw new Error('Invalid authorization token');
    }
}

async function invokeCalculateRunningTotal(householdId) {
    const params = {
        FunctionName: 'calculateRunningTotal',
        Payload: JSON.stringify({ householdId }),
    };

    const command = new InvokeCommand(params);
    try {
        const response = await lambda.send(command);
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));

        if (payload.statusCode !== 200) {
            throw new Error(`Error invoking calculateRunningTotal: ${payload.message || 'unknown error'}`);
        }

        return payload.message;
    } catch (error) {
        console.error('Error invoking calculateRunningTotal:', error);
        throw new Error(`Error invoking calculateRunningTotal: ${error.message}`);
    }
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { authToken, incomeId } = parsedBody;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
        };
    }

    if (!incomeId) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'incomeId is missing' }),
        };
    }

    try {
        // Verify the token
        const user = await verifyToken(authToken);
        const uid = user.user_id;

        if (!uid) {
            throw new Error('Invalid token payload: missing user_id');
        }

        // Retrieve the existing income
        const existingIncome = await prisma.incomes.findUnique({
            where: { incomeId },
        });

        if (!existingIncome) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Income not found' }),
            };
        }

        const householdId = existingIncome.householdId;

        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Delete ledger entries with transactionDate on or after today's date
        await prisma.ledger.deleteMany({
            where: {
                incomeId: incomeId,
                transactionDate: {
                    gte: today
                }
            },
        });

        // Delete the income
        await prisma.incomes.delete({
            where: { incomeId },
        });

        // Invoke calculateRunningTotal Lambda function
        console.log('Invoking calculateRunningTotal with householdId:', householdId);
        await invokeCalculateRunningTotal(householdId);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Income deleted successfully',
                incomeId: incomeId,
            }),
        };
    } catch (error) {
        console.error('Error deleting income:', error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
