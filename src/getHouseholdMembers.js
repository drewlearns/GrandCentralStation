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

    return payload;
}

async function getHouseholdMembers(authToken, householdId) {
    // Verify the token
    const payload = await verifyToken(authToken);
    const uid = payload.uid;

    if (!uid) {
        throw new Error('Invalid token payload: missing uid');
    }

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

    const authToken = event.headers.Authorization;
    const householdId = event.pathParameters.householdId;

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

    try {
        const members = await getHouseholdMembers(authToken, householdId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(members),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
