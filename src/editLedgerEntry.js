const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT'
};

exports.handler = async (event) => {
    const { authorizationToken, refreshToken, ledgerId, updatedDetails } = JSON.parse(event.body);

    if (!authorizationToken || !refreshToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Access denied. No token or refresh token provided.'
            })
        };
    }

    let username;
    let tokenValid = false;

    // First attempt to verify the token
    try {
        username = await verifyToken(authorizationToken);
        tokenValid = true;
    } catch (error) {
        console.error('Token verification failed, attempting refresh:', error.message);

        // Attempt to refresh the token and verify again
        try {
            const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
            username = result.userId;
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
        if (!ledgerId || !updatedDetails) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing ledgerId or updatedDetails parameter'
                })
            };
        }

        // Ensure the paymentSourceId exists if it's being updated
        if (updatedDetails.paymentSourceId) {
            const paymentSource = await prisma.paymentSource.findUnique({
                where: {
                    sourceId: updatedDetails.paymentSourceId
                }
            });

            if (!paymentSource) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'Invalid paymentSourceId'
                    })
                };
            }
        }

        const updateResult = await prisma.ledger.update({
            where: {
                ledgerId: ledgerId
            },
            data: updatedDetails
        });

        // Invoke calculateRunningTotal Lambda function
        const updateTotalsCommand = new InvokeCommand({
            FunctionName: 'calculateRunningTotal',
            Payload: JSON.stringify({ householdId: updateResult.householdId, paymentSourceId: updateResult.paymentSourceId }),
        });

        await lambdaClient.send(updateTotalsCommand);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Ledger entry updated successfully', updateResult }),
        };
    } catch (error) {
        console.error('Error updating ledger entry:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Error updating ledger entry", error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
