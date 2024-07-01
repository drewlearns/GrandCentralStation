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

async function getCategories(authToken, householdId) {
    // Verify the token
    const user = await verifyToken(authToken);
    const uid = user.user_id;

    if (!uid) {
        throw new Error('Invalid token payload: missing user_id');
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch year-to-date categories and their transaction totals
    const yearToDateCategories = await prisma.ledger.groupBy({
        by: ['category'],
        where: {
            householdId,
            transactionDate: {
                gte: startOfYear,
                lte: now,
            },
        },
        _sum: {
            amount: true,
        },
    });

    // Fetch month-to-date categories and their transaction totals
    const monthToDateCategories = await prisma.ledger.groupBy({
        by: ['category'],
        where: {
            householdId,
            transactionDate: {
                gte: startOfMonth,
                lte: now,
            },
        },
        _sum: {
            amount: true,
        },
    });

    // Format the results
    const yearToDateResult = yearToDateCategories.map(category => ({
        category: category.category,
        totalAmount: parseFloat(new Decimal(category._sum.amount).toFixed(2)),
    }));

    const monthToDateResult = monthToDateCategories.map(category => ({
        category: category.category,
        totalAmount: parseFloat(new Decimal(category._sum.amount).toFixed(2)),
    }));

    return { yearToDate: yearToDateResult, monthToDate: monthToDateResult };
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

    const { authToken, householdId } = parsedBody;

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
        const categories = await getCategories(authToken, householdId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(categories),
        };
    } catch (error) {
        console.error('Error getting categories:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
