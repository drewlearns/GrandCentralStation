const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

const prisma = new PrismaClient();
const ses = new AWS.SES({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const { householdId, invitedUserEmail, invitingUserUuid, role, ipAddress, deviceDetails } = JSON.parse(event.body);

    try {
        // Check if the inviting user exists
        const invitingUserExists = await prisma.user.findUnique({
            where: { uuid: invitingUserUuid },
        });

        if (!invitingUserExists) {
            console.log(`Error: Inviting user ${invitingUserUuid} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Inviting user not found',
                }),
            };
        }

        // Check if the invited user exists by email
        const invitedUser = await prisma.user.findUnique({
            where: { email: invitedUserEmail },
        });

        if (!invitedUser) {
            console.log(`Error: Invited user with email ${invitedUserEmail} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Invited user not found',
                }),
            };
        }

        const invitedUserUuid = invitedUser.uuid;

        // Check if the household exists
        const householdExists = await prisma.household.findUnique({
            where: { householdId: householdId },
        });

        if (!householdExists) {
            console.log(`Error: Household ${householdId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        // Check if the user is already a member of the household
        const membershipExists = await prisma.householdMembers.findFirst({
            where: {
                householdId: householdId,
                memberUuid: invitedUserUuid,
            },
        });

        if (membershipExists) {
            console.log(`Error: User ${invitedUserUuid} is already a member of household ${householdId}`);
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'User is already a member of the household',
                }),
            };
        }

        // Create the invitation
        const invitation = await prisma.invitations.create({
            data: {
                invitationId: uuidv4(),
                householdId: householdId,
                invitedUserUuid: invitedUserUuid,
                invitationStatus: 'Pending',
                sentDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Send invitation email using AWS SES
        const emailParams = {
          Source: `noReply@process.env.TTPB_DOMAIN`,
          Destination: {
              ToAddresses: [invitedUserEmail],
          },
          Message: {
              Subject: {
                  Data: 'You are invited to join someone at The Purple Piggy Bank!',
              },
              Body: {
                  Text: {
                      Data: `You have been invited to budget and track expenses using The Purple Piggy Bank with "${householdExists.householdName}". Please accept the invitation code: ${invitation.invitationId}`,
                  },
              },
          },
      };
      
      await ses.sendEmail(emailParams).promise();
      

        await ses.sendEmail(emailParams).promise();

        // Log an entry in the AuditTrail
        await prisma.auditTrail.create({
            data: {
                auditId: uuidv4(),
                tableAffected: 'Invitations',
                actionType: 'Create',
                oldValue: '',
                newValue: JSON.stringify(invitation),
                changedBy: invitingUserUuid,
                changeDate: new Date(),
                timestamp: new Date(),
                device: deviceDetails,
                ipAddress: ipAddress,
                deviceType: '',
                ssoEnabled: 'false',
            },
        });

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Invitation sent successfully',
                invitationId: invitation.invitationId,
                householdId: householdId,
                invitedUserUuid: invitedUserUuid,
            }),
        };
    } catch (error) {
        console.error('Error inviting household member:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error inviting household member',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
