const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda'); // AWS SDK for Lambda
const prisma = new PrismaClient();

// Initialize the Lambda client
const lambdaClient = new LambdaClient({ region: 'your-region' }); // Replace 'your-region' with the appropriate AWS region

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,DELETE'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambdaClient.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const { token, sourceId } = JSON.parse(event.body);

    try {
        const decoded = await verifyToken(token);

        if (!decoded.isValid) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid token' }),
            };
        }

        const paymentSource = await prisma.paymentSource.findUnique({
            where: {
                sourceId: sourceId,
            },
        });

        if (!paymentSource) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Payment source not found' }),
            };
        }

        const householdMember = await prisma.householdMembers.findFirst({
            where: {
                householdId: paymentSource.householdId,
                memberUuid: decoded.uuid,
            },
        });

        if (!householdMember) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Unauthorized' }),
            };
        }

        const deletedPaymentSource = await prisma.paymentSource.delete({
            where: {
                sourceId: sourceId,
            },
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(deletedPaymentSource),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
