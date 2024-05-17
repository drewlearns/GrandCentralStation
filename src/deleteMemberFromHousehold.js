const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { householdId, memberUuid, removingUserUuid, ipAddress, deviceDetails } = JSON.parse(event.body);

    try {
        // Check if the household exists and get the creator's UUID
        const household = await prisma.household.findUnique({
            where: { householdId: householdId },
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

        // Check if the removing user is the creator of the household
        if (household.createdBy !== removingUserUuid) {
            console.log(`Error: User ${removingUserUuid} is not the creator of household ${householdId}`);
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
