const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });
const secretsManagerClient = new SecretsManagerClient({ region: 'us-east-1' });

const CORS_HEADERS = {
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

async function validateUser(userId, householdId) {
    const user = await prisma.user.findUnique({
        where: { uuid: userId },
    });

    if (!user) {
        return false;
    }

    const householdMembers = await prisma.householdMembers.findMany({
        where: { householdId },
        select: { memberUuid: true },
    });

    const memberUuids = householdMembers.map(member => member.memberUuid);
    return memberUuids.includes(userId);
}

async function getBillPassword(authToken, billId) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    if (!userId) {
        throw new Error('Invalid authorization token');
    }

    const bill = await prisma.bill.findUnique({
        where: { billId },
    });

    if (!bill) {
        return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Bill not found' }),
        };
    }

    const isValidUser = await validateUser(userId, bill.householdId);
    if (!isValidUser) {
        throw new Error('Invalid user or household association.');
    }

    const secretArn = `bill-credentials/${billId}`; 
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsManagerClient.send(command);

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ secret: JSON.parse(response.SecretString) }),
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
        const { authToken, billId } = JSON.parse(event.body);

        if (!authToken) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Authorization token is missing' }),
            };
        }

        if (!billId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'billId is missing' }),
            };
        }

        const response = await getBillPassword(authToken, billId);

        return response;
    } catch (error) {
        console.error(`Error:`, error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: false,
                message: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
