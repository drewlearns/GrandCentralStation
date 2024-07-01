const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
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

async function getHouseholdOwner(householdId) {
    const owner = await prisma.householdMembers.findFirst({
        where: { 
            householdId: householdId,
            role: 'owner'
        },
        select: { memberUuid: true }
    });

    console.log("Household owner UUID:", owner ? owner.memberUuid : "None");

    return owner ? owner.memberUuid : null;
}

async function deleteHouseholdMember(authToken, householdId, memberUuid) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.user_id;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

    // Check if the user is the owner or the member themselves
    const ownerUuid = await getHouseholdOwner(householdId);

    console.log("Current user UUID:", uid);
    console.log("Owner UUID:", ownerUuid);
    console.log("Member UUID to be deleted:", memberUuid);

    if (uid !== ownerUuid && uid !== memberUuid) {
        throw new Error('Not authorized to delete this member');
    }

    // Proceed to delete the member
    await prisma.householdMembers.deleteMany({
        where: {
            householdId: householdId,
            memberUuid: memberUuid,
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    let parsedBody;

    try {
        parsedBody = JSON.parse(event.body);
        console.log('Parsed request body:', parsedBody);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { authToken, householdId, memberUuid } = parsedBody;

    // Validate required fields
    if (!authToken) {
        console.error('Authorization token is missing');
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!householdId || !memberUuid) {
        console.error('householdId or memberUuid is missing');
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'householdId or memberUuid is missing' }),
        };
    }

    try {
        const result = await deleteHouseholdMember(authToken, householdId, memberUuid);
        console.log('Member deleted successfully:', result);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error('Error deleting household member:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Error deleting household member', details: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
