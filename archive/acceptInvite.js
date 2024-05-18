const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { invitationId, ipAddress, deviceDetails } = JSON.parse(event.body);

    try {
        // Check if the invitation exists and is still pending
        const invitation = await prisma.invitations.findUnique({
            where: { invitationId: invitationId },
        });

        if (!invitation) {
            console.log(`Error: Invitation ${invitationId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Invitation not found',
                }),
            };
        }

        if (invitation.invitationStatus !== 'Pending') {
            console.log(`Error: Invitation ${invitationId} is not pending`);
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Invitation is not pending',
                }),
            };
        }

        const { householdId, invitedUserUuid } = invitation;

        // Add the user as a member of the household
        const householdMember = await prisma.householdMembers.create({
            data: {
                id: uuidv4(),
                householdId: householdId,
                memberUuid: invitedUserUuid,
                role: 'Member', // Adjust the role as needed
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Update the invitation status to accepted
        await prisma.invitations.update({
            where: { invitationId: invitationId },
            data: {
                invitationStatus: 'Accepted',
                updatedAt: new Date(),
            },
        });

        // Log an entry in the AuditTrail
        await prisma.auditTrail.create({
            data: {
                auditId: uuidv4(),
                tableAffected: 'HouseholdMembers',
                actionType: 'Create',
                oldValue: '',
                newValue: JSON.stringify(householdMember),
                changedBy: invitedUserUuid,
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
                message: 'Invitation accepted successfully',
                householdMember: householdMember,
            }),
        };
    } catch (error) {
        console.error('Error accepting invitation:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error accepting invitation',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
