const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
    const { authorizationToken, refreshToken, householdId, householdName, account, setupComplete, activeSubscription } = JSON.parse(event.body);

    if (!authorizationToken || !refreshToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }

    let updatedBy;
    let tokenValid = false;

    // First attempt to verify the token
    try {
        updatedBy = await verifyToken(authorizationToken);
        tokenValid = true;
    } catch (error) {
        console.error('Token verification failed, attempting refresh:', error.message);

        // Attempt to refresh the token and verify again
        try {
            const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
            updatedBy = result.userId;
            tokenValid = true;
        } catch (refreshError) {
            console.error('Token refresh and verification failed:', refreshError);
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
            };
        }
    }

    if (!tokenValid) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid token.' }),
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
                account: account,
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
