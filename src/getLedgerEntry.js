const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

exports.handler = async (event) => {
    const { authorizationToken, ledgerId } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }

    if (!ledgerId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Missing ledgerId parameter'
            })
        };
    }

    let username;
    try {
        // Invoke verifyToken Lambda function
        const verifyTokenCommand = new InvokeCommand({
            FunctionName: 'verifyToken', // Replace with the actual function name
            Payload: JSON.stringify({ authorizationToken })
        });

        const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
        const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

        if (verifyTokenResponse.FunctionError) {
            throw new Error(payload.errorMessage || 'Token verification failed.');
        }

        username = payload.username;
        if (!username) {
            throw new Error('Token verification did not return a valid username.');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Invalid token.',
                error: error.message,
            }),
        };
    }

    try {
        const ledgerEntry = await prisma.ledger.findUnique({
            where: {
                ledgerId: ledgerId
            },
            include: {
                bill: true,
                income: true,
                transactions: true,
                paymentSource: true,  // Assuming `paymentSource` is the correct relation name
            }
        });

        if (!ledgerEntry) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Ledger entry not found" }),
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ ledgerEntry: ledgerEntry }),
        };
    } catch (error) {
        console.error('Error retrieving ledger entry:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Error retrieving ledger entry", error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
