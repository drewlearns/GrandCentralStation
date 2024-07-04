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

async function getHouseholdMembers(authToken, householdId) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.user_id;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

    if (!householdId || householdId === 'null') {
        throw new Error('householdId is null or undefined');
    }

    console.log(`Fetching members for household ID: ${householdId}`);

    // Fetch household members
    const members = await prisma.householdMembers.findMany({
        where: {
            householdId: householdId,
        },
        select: {
            member: {
                select: {
                    uuid: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            role: true,
            joinedDate: true,
        },
    });

    console.log(`Members fetched: ${JSON.stringify(members)}`);

    // Format the results
    const result = members.map(member => ({
        uuid: member.member.uuid,
        firstName: member.member.firstName,
        lastName: member.member.lastName,
        email: member.member.email,
        role: member.role,
        joinedDate: member.joinedDate,
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

    const { authToken, householdId } = parsedBody;

    // Validate required fields
    if (!authToken) {
        console.error('Authorization token is missing');
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!householdId || householdId === 'null') {
        console.error('householdId is missing or null');
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'householdId is missing or null' }),
        };
    }

    try {
        const members = await getHouseholdMembers(authToken, householdId);
        console.log('Household members fetched:', members);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(members),
        };
    } catch (error) {
        console.error('Error fetching household members:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Error fetching household members', details: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
