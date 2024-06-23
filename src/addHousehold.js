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
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload.isValid;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const { authToken, householdData } = JSON.parse(event.body);

    try {
        // Verify the token
        const isValid = await verifyToken(authToken);
        if (!isValid) {
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
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

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
            body: JSON.stringify({ message: error.message }),
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
