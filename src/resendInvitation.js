const { PrismaClient } = require('@prisma/client');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

const prisma = new PrismaClient();
const sesClient = new SESClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const { invitationId } = JSON.parse(event.body);

    try {
        // Check if the invitation exists and is still pending
        const invitation = await prisma.invitations.findUnique({
            where: { invitationId: invitationId },
        });

        if (!invitation) {
            console.log(`Error: Invitation ${invitationId} does not exist`);
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Invitation not found',
                }),
            };
        }

        if (invitation.invitationStatus !== 'Pending') {
            console.log(`Error: Invitation ${invitationId} is not pending`);
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Invitation is not pending',
                }),
            };
        }

        // Get household details
        const household = await prisma.household.findUnique({
            where: { householdId: invitation.householdId },
        });

        if (!household) {
            console.log(`Error: Household ${invitation.householdId} does not exist`);
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        // Get invited user details
        const invitedUser = await prisma.user.findUnique({
            where: { uuid: invitation.invitedUserUuid },
        });

        if (!invitedUser) {
            console.log(`Error: Invited user ${invitation.invitedUserUuid} does not exist`);
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Invited user not found',
                }),
            };
        }

        const invitedUserEmail = invitedUser.email;

        // Resend the invitation email using AWS SES
        const emailParams = {
            Source: `noReply@${process.env.TTPB_DOMAIN}`,
            Destination: {
                ToAddresses: [invitedUserEmail],
            },
            Message: {
                Subject: {
                    Data: 'You are invited to join someone at The Purple Piggy Bank!',
                },
                Body: {
                    Text: {
                        Data: `You have been invited to budget and track expenses using The Purple Piggy Bank with "${household.householdName}". Please accept the invitation code: ${invitation.invitationId}`,
                    },
                },
            },
        };
        await sesClient.send(new SendEmailCommand(emailParams));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Invitation resent successfully',
                invitationId: invitation.invitationId,
                householdId: invitation.householdId,
                invitedUserUuid: invitation.invitedUserUuid,
            }),
        };
    } catch (error) {
        console.error('Error resending invitation:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error resending invitation',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
