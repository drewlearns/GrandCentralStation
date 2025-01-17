const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
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

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const body = JSON.parse(event.body);
    const authToken = body.authToken;
    const query = body.query;

    if (!authToken) {
        console.log('No authorization token provided.');
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }

    let userId;

    // Verify the token
    try {
        const payload = await verifyToken(authToken);
        userId = payload.user_id;
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Invalid token.',
                error: error.message,
            }),
        };
    }

    if (!userId) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid token payload: missing user_id' }),
        };
    }

    try {
        console.log('Fetching households for user...');
        const userHouseholds = await prisma.householdMembers.findMany({
            where: {
                memberUuid: userId,
            },
            select: {
                householdId: true,
            }
        });

        const householdIds = userHouseholds.map(householdMember => householdMember.householdId);
        console.log('Household IDs:', householdIds);

        if (householdIds.length === 0) {
            console.log('No associated households found for user:', userId);
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: "No associated households found" }),
            };
        }

        const amountQuery = parseFloat(query);
        const isAmountQueryValid = !isNaN(amountQuery);
        console.log('Query:', query, 'Amount Query:', amountQuery, 'Is Amount Query Valid:', isAmountQueryValid);

        const ledgerSearchConditions = [
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
            { transactionType: { contains: query, mode: 'insensitive' } },
        ];

        if (isAmountQueryValid) {
            ledgerSearchConditions.unshift({ amount: { equals: amountQuery } });
        }

        console.log('Searching ledgers with conditions:', JSON.stringify(ledgerSearchConditions, null, 2));

        const ledgers = await prisma.ledger.findMany({
            where: {
                householdId: { in: householdIds },
                OR: ledgerSearchConditions,
            },
            include: {
                bill: true,
                income: true,
                transactions: true,
                paymentSource: true,
                household: true,
            },
        });

        if (ledgers.length === 0) {
            console.log('No transactions found matching the query for user:', userId);
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: "No transactions found matching the query" }),
            };
        }

        console.log('Ledgers found:', ledgers.length);

        const formatNumber = (num) => Number(new Decimal(num).toFixed(2));

        const setDefaultValues = (entry) => {
            entry.billId = entry.billId || '';
            entry.incomeId = entry.incomeId || '';
            entry.transactionId = entry.transactionId || '';
            entry.amount = entry.amount != null ? formatNumber(entry.amount) : 0.0;
            entry.description = entry.description || '';
            entry.tags = entry.tags || '';
            entry.category = entry.category || '';
            entry.transactionType = entry.transactionType || '';
            entry.transactionDate = entry.transactionDate || '';
            entry.householdName = entry.household ? entry.household.householdName : '';
            entry.paymentSourceName = entry.paymentSource ? entry.paymentSource.sourceName : '';
        };

        const flattenedLedgers = ledgers.map(entry => {
            const flattenedEntry = {
                ...entry,
                billId: entry.bill ? entry.bill.billId : '',
                incomeId: entry.income ? entry.income.incomeId : '',
                transactionId: entry.transactions && entry.transactions.length > 0 ? entry.transactions[0].transactionId : '',
                householdName: entry.household ? entry.household.householdName : '',
                paymentSourceName: entry.paymentSource ? entry.paymentSource.sourceName : '',
            };

            setDefaultValues(flattenedEntry);
            return flattenedEntry;
        });

        console.log('Flattened Ledgers:', JSON.stringify(flattenedLedgers, null, 2));

        const jsonString = JSON.stringify({ transactions: flattenedLedgers }, (key, value) => {
            if (typeof value === 'number') {
                return Number(value).toFixed(2);
            }
            return value;
        });

        const formattedJsonString = jsonString.replace(/"(-?\d+\.\d{2})"/g, '$1');

        console.log('Returning formatted JSON string:', formattedJsonString);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: formattedJsonString,
        };
    } catch (error) {
        console.error(`Error retrieving transactions: ${error.message}`);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: "Error retrieving transactions",
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
