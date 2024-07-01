const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
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

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
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
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { authToken, householdData } = parsedBody;

    // Validate required fields
    if (!authToken || !householdData || !householdData.householdName) {
        console.error('Missing required fields', { authToken, householdData });
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Missing required fields' }),
        };
    }

    try {
        // Verify the token
        const user = await verifyToken(authToken);
        if (!user) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid authorization token' }),
            };
        }

        // Create the new household
        const newHousehold = await prisma.household.create({
            data: {
                householdName: householdData.householdName,
                activeSubscription: householdData.activeSubscription || false,
                creationDate: new Date(),
                setupComplete: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        console.log('Household created:', newHousehold);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(newHousehold),
        };
    } catch (error) {
        console.error('Error creating household:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Error creating household', error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};

// Example event payload
/*
{
    "authToken": "your-auth-token",
    "householdData": {
        "householdName": "Smith Family",
        "activeSubscription": false
    }
}
*/
