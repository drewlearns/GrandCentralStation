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

async function getLedgerEntries(authToken, householdId, filters = {}, threshold = 500) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;
    if (!userId) {
        throw new Error('Invalid authorization token');
    }

    const isValidUser = await validateUser(userId, householdId);
    if (!isValidUser) {
        throw new Error('Invalid user or household association.');
    }

    const currentDate = new Date();
    let where = {
        householdId,
    };

    // Applying filters for transaction date
    if (filters.showCurrentMonthOnly) {
        where.transactionDate = {
            gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
            lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
        };
    } else if (filters.month && filters.year) {
        where.transactionDate = {
            gte: new Date(filters.year, filters.month - 1, 1),
            lt: new Date(filters.year, filters.month, 1),
        };
    } else if (filters.showCurrentMonthUpToToday !== false) {
        // Default case: transactions up to today
        where.transactionDate = {
            lte: new Date(),
        };
    }

    // Applying the showClearedOnly filter
    if (filters.showClearedOnly) {
        where.status = true;
    }

    // Logging to debug where clause
    console.log("getLedgerEntries - where clause:", where);

    const ledgerEntries = await prisma.ledger.findMany({
        where: where,
        select: {
            ledgerId: true,
            householdId: true,
            paymentSourceId: true,
            amount: true,
            transactionType: true,
            transactionDate: true,
            category: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            updatedBy: true,
            billId: true,
            incomeId: true,
            runningTotal: true,
            tags: true,
            isInitial: true,
            bill: {
                select: {
                    billId: true,
                }
            },
            income: {
                select: {
                    incomeId: true,
                }
            },
            transactions: {
                select: {
                    transactionId: true,
                }
            },
            paymentSource: {
                select: {
                    sourceName: true
                }
            }
        },
        orderBy: [
            { transactionDate: 'desc' },
        ],
        // Remove skip and take to disable pagination
    });

    const totalItems = ledgerEntries.length;
    const totalPages = 1; // Since pagination is disabled, there's only one "page" of results

    if (ledgerEntries.length === 0) {
        return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: "No ledger entries found" }),
        };
    }

    const formatNumber = (num) => Number(new Decimal(num).toFixed(2));

    const setDefaultValues = (entry) => {
        if (entry.billId === null) entry.billId = '';
        if (entry.incomeId === null) entry.incomeId = '';
        if (entry.transactionId === null) entry.transactionId = '';
    };

    const flattenedLedgerEntries = ledgerEntries.map((entry) => {
        const flattenedEntry = { ...entry, ledgerId: entry.ledgerId };

        // Assign the first transaction's ID if available
        if (entry.transactions && entry.transactions.length > 0) {
            flattenedEntry.transactionId = entry.transactions[0].transactionId;
        } else {
            flattenedEntry.transactionId = ''; // Handle cases with no transactions
        }

        // Determine the type of entry
        if (flattenedEntry.bill && flattenedEntry.bill.billId) {
            flattenedEntry.type = 'bill';
        } else if (flattenedEntry.income && flattenedEntry.income.incomeId) {
            flattenedEntry.type = 'income';
        } else if (flattenedEntry.category === 'Income') {
            flattenedEntry.type = 'income';
        } else {
            flattenedEntry.type = 'transaction';
        }

        setDefaultValues(flattenedEntry);

        if (flattenedEntry.amount !== null) {
            flattenedEntry.amount = formatNumber(flattenedEntry.amount);
        }
        if (flattenedEntry.runningTotal !== null) {
            flattenedEntry.runningTotal = formatNumber(flattenedEntry.runningTotal);
        }

        // Format the transactionDate to MM-DD-YYYY
        const date = new Date(flattenedEntry.transactionDate);
        const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
        flattenedEntry.transactionDate = formattedDate;
        flattenedEntry.year = date.getFullYear();
        flattenedEntry.month = date.toLocaleString('default', { month: 'long' }).toLowerCase();

        // Check if runningTotal is less than threshold and set threshold boolean
        flattenedEntry.threshold = threshold !== undefined ? flattenedEntry.runningTotal < threshold : false;

        return flattenedEntry;
    });

    return {
        flattenedLedgerEntries,
        totalPages,
        totalItems,
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
        const { authToken, householdId, filters, threshold = 500 } = JSON.parse(event.body);

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

        const { flattenedLedgerEntries, totalPages, totalItems } = await getLedgerEntries(authToken, householdId, filters, threshold);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                data: flattenedLedgerEntries,
                totalPages: totalPages,
                totalItems: totalItems
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
