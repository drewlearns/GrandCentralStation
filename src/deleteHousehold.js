const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const { authorizationToken, householdId, ipAddress, deviceDetails } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
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
            console.log(`Error: Household ${householdId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        const owner = household.members.find(member => member.role === 'Owner');

        if (!owner || owner.memberUuid !== deletedBy) {
            console.log(`Error: User ${deletedBy} is not authorized to delete household ${householdId}`);
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

        await prisma.auditTrail.create({
            data: {
                auditId: uuidv4(),
                tableAffected: 'Household',
                actionType: 'Delete',
                oldValue: JSON.stringify(household),
                newValue: '',
                changedBy: deletedBy,
                changeDate: new Date(),
                timestamp: new Date(),
                device: deviceDetails,
                ipAddress: ipAddress,
                deviceType: '',
                ssoEnabled: 'false',
            },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Household deleted successfully',
                householdId: householdId,
            }),
        };
    } catch (error) {
        console.error('Error deleting household:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error deleting household',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
