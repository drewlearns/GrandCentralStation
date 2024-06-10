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
    const { authorizationToken, householdId, householdName, account, setupComplete, activeSubscription } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }
    let updatedBy;
    try {
        // Invoke verifyToken Lambda function
        const verifyTokenCommand = new InvokeCommand({
            FunctionName: 'verifyToken',
            Payload: JSON.stringify({ authorizationToken })
        });

        const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
        const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

        if (verifyTokenResponse.FunctionError) {
            throw new Error(payload.errorMessage || 'Token verification failed.');
        }

        updatedBy = payload.username;
        if (!updatedBy) {
            throw new Error('Token verification did not return a valid UUID.');
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
        const householdExists = await prisma.household.findUnique({
            where: { householdId: householdId },
        });

        if (!householdExists) {
            console.log(`Error: Household ${householdId} does not exist`);
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        const updatedHousehold = await prisma.household.update({
            where: { householdId: householdId },
            data: {
                householdName: householdName,
                ccount: account,
                setupComplete: setupComplete,
                activeSubscription: activeSubscription,
                updatedAt: new Date(),
            },
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Household updated successfully',
                householdId: updatedHousehold.householdId,
                householdName: updatedHousehold.householdName,
                setupComplete: updatedHousehold.setupComplete,
                activeSubscription: updatedHousehold.activeSubscription,
            }),
        };
    } catch (error) {
        console.error('Error updating household:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error updating household',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
