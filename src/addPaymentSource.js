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

    const { authToken, householdId, name, type } = JSON.parse(event.body);

    try {
        // Verify the token
        const isValid = await verifyToken(authToken);
        if (!isValid) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid authorization token' }),
            };
        }

        // Create the new payment source
        const newPaymentSource = await prisma.paymentSource.create({
            data: {
                householdId: householdId,
                sourceName: name,
                sourceType: type,
                description: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(newPaymentSource),
        };
    } catch (error) {
        console.error('Error adding payment source:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
}

// Example usage:
// const authToken = 'your-auth-token';
// const householdId = 'your-household-id';
// const name = 'Bank Account';
// const type = 'Checking';

// addPaymentSource(authToken, householdId, name, type)
//     .then(newPaymentSource => console.log('New payment source added:', newPaymentSource))
//     .catch(error => console.error('Error adding payment source:', error));
