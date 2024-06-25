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
        FunctionName: 'verifyToken',
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    // Log the initial payload for debugging
    console.log("verifyToken response payload:", payload);

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    // Parse the nested JSON body
    const nestedPayload = JSON.parse(payload.body);

    // Log the nested payload for debugging
    console.log("verifyToken nested payload:", nestedPayload);

    return nestedPayload;
}

async function validateUser(userId, householdId) {
    console.log("validateUser - userId:", userId);
    console.log("validateUser - householdId:", householdId);

    const user = await prisma.user.findUnique({
        where: { uuid: userId },
    });

    console.log("validateUser - user:", user);

    if (!user) {
        return false;
    }

    const householdMembers = await prisma.householdMembers.findMany({
        where: {
            householdId: householdId,
        },
        select: {
            memberUuid: true,
        },
    });

    console.log("validateUser - householdMembers:", householdMembers);

    const memberUuids = householdMembers.map(member => member.memberUuid);
    const isValidUser = memberUuids.includes(userId);

    console.log("validateUser - isValidUser:", isValidUser);

    return isValidUser;
}


async function getBills(authToken, householdId, filterType) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    if (!userId) {
        throw new Error('Invalid authorization token: No user ID found in token.');
    }

    // Validate the user and household association
    const isValidUser = await validateUser(userId, householdId);
    if (!isValidUser) {
        throw new Error('Invalid user or household association.');
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
            orderBy = {
                transactionDate: 'desc',
            };
            break;
        case 'currentlyDue':
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);

            where = {
                ...where,
                status: false,
                transactionDate: {
                    gte: currentDate,
                    lt: tomorrow,
                },
            };
            orderBy = {
                transactionDate: 'desc',
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
            ledgerId: true,
            billId: true,
            amount: true,
            transactionDate: true,
            status: true,
            paymentSourceId: true,
            description: true, // Include description field
            paymentSource: {
                select: {
                    sourceName: true, // Correct field name based on schema
                },
            },
        },
    });

    if (bills.length === 0) {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'No bills found for the given criteria.' }),
        };
    }

    // Format the results
    const result = bills.map(bill => ({
        ledgerId: bill.ledgerId,
        billId: bill.billId,
        amount: new Decimal(bill.amount).toNumber(), // Convert to number
        transactionDate: bill.transactionDate,
        status: bill.status,
        paymentSourceId: bill.paymentSourceId,
        paymentSourceName: bill.paymentSource?.sourceName || null, // Include paymentSourceName
        description: bill.description, // Include description
    }));

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            message: 'Successfully found ledger entries.',
            ledgerEntries: result
        }),
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid JSON body' }),
        };
    }

    const authToken = body.authToken;
    const householdId = body.householdId;
    const filterType = body.filterType;

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
        const response = await getBills(authToken, householdId, filterType);
        return response;
    } catch (error) {
        console.error("Error:", error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
