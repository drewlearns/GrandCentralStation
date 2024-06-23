const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,DELETE',
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

    return payload;
}

async function getHouseholdOwner(householdId) {
    const owner = await prisma.household.findUnique({
        where: { householdId: householdId },
        select: { defaultHouseholdId: true }
    });

    return owner ? owner.defaultHouseholdId : null;
}

async function deleteHouseholdMember(authToken, householdId, memberUuid) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.uid;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

    // Check if the user is the owner or the member themselves
    const ownerUuid = await getHouseholdOwner(householdId);

    if (uid !== ownerUuid && uid !== memberUuid) {
        throw new Error('Not authorized to delete this member');
    }

    // Proceed to delete the member
    await prisma.householdMembers.delete({
        where: {
            householdId_memberUuid: {
                householdId: householdId,
                memberUuid: memberUuid,
            },
        },
    });

    return { message: 'Member deleted successfully' };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const authToken = event.headers.Authorization;
    const householdId = event.pathParameters.householdId;
    const memberUuid = event.pathParameters.memberUuid;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!householdId || !memberUuid) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'householdId or memberUuid is missing' }),
        };
    }

    try {
        const result = await deleteHouseholdMember(authToken, householdId, memberUuid);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(result),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
