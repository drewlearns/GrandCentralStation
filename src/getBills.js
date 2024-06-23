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

async function getBills(authToken, householdId, filterType) {
    // Verify the token
    const isValid = await verifyToken(authToken);
    if (!isValid) {
        throw new Error('Invalid authorization token');
    }

    let where = {
        householdId,
        billId: {
            not: null,
        },
    };

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let orderBy = {
        transactionDate: 'desc',
    };

    switch (filterType) {
        case 'pastDue':
            where = {
                ...where,
                status: false,
                transactionDate: {
                    lt: currentDate,
                },
            };
            break;
        case 'currentlyDue':
            where = {
                ...where,
                transactionDate: currentDate,
            };
            break;
        case 'futureDue':
            where = {
                ...where,
                status: false,
                transactionDate: {
                    gt: currentDate,
                },
            };
            orderBy = {
                transactionDate: 'asc',
            };
            break;
        case 'paid':
            where = {
                ...where,
                status: true,
            };
            break;
        default:
            throw new Error('Invalid filter type');
    }

    const bills = await prisma.ledger.findMany({
        where,
        orderBy,
        select: {
            billId: true,
            amount: true,
            transactionDate: true,
            status: true,
            paymentSourceId: true,
        },
    });

    // Format the results
    const result = bills.map(bill => ({
        billId: bill.billId,
        amount: new Decimal(bill.amount).toFixed(2),
        transactionDate: bill.transactionDate,
        status: bill.status,
        paymentSourceId: bill.paymentSourceId,
    }));

    return result;
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
    const filterType = event.queryStringParameters?.filterType;

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

    if (!filterType) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'filterType is missing' }),
        };
    }

    try {
        const bills = await getBills(authToken, householdId, filterType);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(bills),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
