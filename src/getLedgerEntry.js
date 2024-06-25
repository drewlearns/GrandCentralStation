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

async function getLedgerEntry(authToken, ledgerId) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    console.log("getLedgerEntry - userId:", userId);

    if (!userId) {
        throw new Error('Invalid authorization token: No user ID found in token.');
    }

    const ledgerEntry = await prisma.ledger.findUnique({
        where: { ledgerId: ledgerId },
        include: {
            household: true,
            paymentSource: true,
            bill: false,
            income: false,
            attachments: true,
            transactions: false
        },
    });

    console.log("getLedgerEntry - ledgerEntry:", ledgerEntry);

    if (!ledgerEntry) {
        throw new Error('Ledger entry not found');
    }

    const householdId = ledgerEntry.householdId;

    const isValidUser = await validateUser(userId, householdId);
    if (!isValidUser) {
        throw new Error('Invalid user or household association.');
    }

    return ledgerEntry;
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
    const ledgerId = body.ledgerId;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!ledgerId) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'ledgerId is missing' }),
        };
    }

    try {
        const ledgerEntry = await getLedgerEntry(authToken, ledgerId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(ledgerEntry),
        };
    } catch (error) {
        console.error("Error:", error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
