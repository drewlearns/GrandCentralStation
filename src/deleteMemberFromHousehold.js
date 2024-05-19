const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const { authorizationToken, householdId, memberUuid, ipAddress, deviceDetails } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }

    let removingUserUuid;

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

        removingUserUuid = payload.username;
        if (!removingUserUuid) {
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
        // Check if the household exists
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

        // Check if the removing user is an owner of the household
        const isOwner = household.members.some(member => member.memberUuid === removingUserUuid);

        if (!isOwner) {
            console.log(`Error: User ${removingUserUuid} is not an owner of household ${householdId}`);
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: 'You do not have permission to remove members from this household',
                }),
            };
        }

        // Check if the member exists in the household
        const membership = await prisma.householdMembers.findFirst({
            where: {
                householdId: householdId,
                memberUuid: memberUuid,
            },
        });

        if (!membership) {
            console.log(`Error: User ${memberUuid} is not a member of household ${householdId}`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User is not a member of the household',
                }),
            };
        }

        // Delete the member from the household
        await prisma.householdMembers.delete({
            where: {
                id: membership.id,
            },
        });

        // Log an entry in the AuditTrail
        await prisma.auditTrail.create({
            data: {
                auditId: uuidv4(),
                tableAffected: 'HouseholdMembers',
                actionType: 'Delete',
                oldValue: JSON.stringify(membership),
                newValue: '',
                changedBy: removingUserUuid,
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
                message: 'Household member removed successfully',
            }),
        };
    } catch (error) {
        console.error('Error removing household member:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error removing household member',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
