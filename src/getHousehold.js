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
        Payload: JSON.stringify({ authToken: token }),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log('Token verification result:', JSON.stringify(result, null, 2)); // Log the result

    if (result.errorMessage) {
        throw new Error(result.errorMessage);
    }

    const payload = JSON.parse(result.body); // Parse the body to get the actual payload

    return payload;
}

async function getHouseholds(authToken) {
    const payload = await verifyToken(authToken);
    const userId = payload.user_id;

    console.log('User ID:', userId); // Log the user_id

    if (!userId) {
        throw new Error('Invalid token payload: missing user_id');
    }

    // Find all households where the user is a member
    const householdMemberships = await prisma.householdMembers.findMany({
        where: {
            memberUuid: userId,
        },
        select: {
            householdId: true,
        },
    });

    const householdIds = householdMemberships.map(member => member.householdId);

    // Fetch household details
    const households = await prisma.household.findMany({
        where: {
            householdId: {
                in: householdIds,
            },
        },
        select: {
            householdId: true,
            householdName: true,
        },
    });

    // Separate householdIds and householdNames
    const householdIdsArray = households.map(household => household.householdId);
    const householdNamesArray = households.map(household => household.householdName);

    return {
        householdIds: householdIdsArray,
        householdNames: householdNamesArray,
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let authToken;
    try {
        authToken = JSON.parse(event.body).authToken; // Parse authToken from body
        console.log('Auth Token:', authToken); // Log the auth token
    } catch (error) {
        console.error('Invalid request body:', error.message); // Log the error
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid request body', message: error.message }),
        };
    }

    if (!authToken) {
        console.error('Authorization token is missing'); // Log the missing token error
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    try {
        const households = await getHouseholds(authToken);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(households),
        };
    } catch (error) {
        console.error('Error fetching households:', error.message); // Log the fetching error
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
