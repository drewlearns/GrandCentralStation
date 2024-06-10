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
    const { authorizationToken, householdId} = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }
    let deletedBy;
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

        deletedBy = payload.username;
        if (!deletedBy) {
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
        const household = await prisma.household.findUnique({
            where: { householdId: householdId },
            include: {
                members: {
                    where: {
                        role: 'Owner',
                    }
                }
            }
        });

        if (!household) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        const owner = household.members.find(member => member.role === 'Owner');

        if (!owner || owner.memberUuid !== deletedBy) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: 'You are not authorized to delete this household',
                }),
            };
        }

        await prisma.$transaction(async (prisma) => {
            // Delete related data first to avoid foreign key constraint issues
            await prisma.householdMembers.deleteMany({ where: { householdId: householdId } });
            await prisma.incomes.deleteMany({ where: { householdId: householdId } });
            await prisma.ledger.deleteMany({ where: { householdId: householdId } });
            await prisma.bill.deleteMany({ where: { householdId: householdId } });
            await prisma.preferences.deleteMany({ where: { householdId: householdId } });
            await prisma.invitations.deleteMany({ where: { householdId: householdId } });
            await prisma.paymentSource.deleteMany({ where: { householdId: householdId } });

            // Now delete the household
            await prisma.household.delete({
                where: { householdId: householdId },
            });
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Household deleted successfully',
                householdId: householdId,
            }),
        };
    } catch (error) {
        console.error('Error deleting household:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error deleting household',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
