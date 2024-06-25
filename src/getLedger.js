const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
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

    console.log("verifyToken response payload:", payload);

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    const nestedPayload = JSON.parse(payload.body);

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

async function getLedgerEntries(authToken, householdId, filters = {}) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;
    if (!userId) {
        throw new Error('Invalid authorization token');
    }

    const isValidUser = await validateUser(userId, householdId);
    if (!isValidUser) {
        throw new Error('Invalid user or household association.');
    }

    let where = {
        householdId,
        transactionDate: {
            lte: new Date(),
        },
    };

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (filters.showCurrentMonthOnly) {
        where.transactionDate = {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1),
        };
    }

    if (filters.showClearedOnly) {
        where.cleared = true;
    }

    if (filters.month && filters.year) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 1);
        where.transactionDate = {
            gte: startDate,
            lt: endDate,
        };
    }

    if (filters.showCurrentMonthUpToToday === false) {
        delete where.transactionDate;
    }

    const ledgerEntries = await prisma.ledger.findMany({
        where,
        orderBy: {
            transactionDate: 'desc',
        },
        include: {
            bill: true,
            income: true,
            transactions: true,
            paymentSource: {
                select: {
                    sourceName: true,
                },
            },
        },
    });

    const result = ledgerEntries.map(entry => ({
        ...entry,
        amount: new Decimal(entry.amount).toNumber(),
        runningTotal: new Decimal(entry.runningTotal).toNumber(),
        month: entry.transactionDate.getMonth() + 1,
        year: entry.transactionDate.getFullYear(),
        dayOfMonth: entry.transactionDate.getDate(),
        type: entry.billId ? 'bill' : entry.incomeId ? 'income' : 'transaction',
        bill: entry.bill || null,
        income: entry.income || null,
        transaction: entry.transactions.length > 0 ? entry.transactions[0] : null,
        paymentSourceName: entry.paymentSource?.sourceName || null,
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

    try {
        const { authToken, householdId, filters = {} } = JSON.parse(event.body);

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

        const ledgerEntries = await getLedgerEntries(authToken, householdId, filters);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                data: ledgerEntries,
            }),
        };
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
