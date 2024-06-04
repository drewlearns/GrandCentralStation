const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    let parsedBody;

    try {
        parsedBody = JSON.parse(event.body);
    } catch (error) {
        console.log('Error parsing event body:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { invitationId, username, mailOptIn, firstName, lastName, phoneNumber, password } = parsedBody;

    // Validate required fields
    if (!invitationId || !username || !password || !firstName || !lastName || !phoneNumber ) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing required fields',
            }),
        };
    }

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

        const { householdId, invitedUserEmail } = invitation;

        // Check if the user with the same email already exists
        const existingUserByEmail = await prisma.user.findFirst({
            where: { email: invitedUserEmail },
        });

        let newUserUuid;
        if (existingUserByEmail) {
            newUserUuid = existingUserByEmail.uuid;
        } else {
            // Check if the username is unique
            const existingUserByUsername = await prisma.user.findUnique({
                where: { username: username },
            });

            if (existingUserByUsername) {
                console.log(`Error: Username ${username} is already taken`);
                return {
                    statusCode: 409,
                    body: JSON.stringify({
                        message: 'Username is already taken',
                    }),
                };
            }

            // Invoke the addUser.js Lambda to create the user in Cognito
            const addUserCommand = new InvokeCommand({
                FunctionName: 'addUser',
                Payload: JSON.stringify({
                    body: JSON.stringify({
                        username: username,
                        email: invitedUserEmail,
                        password: password,
                        mailOptIn: mailOptIn,
                        phoneNumber: phoneNumber,
                        firstName: firstName,
                        lastName: lastName,
                    })
                }),
            });

            const addUserResponse = await lambdaClient.send(addUserCommand);
            const addUserPayload = JSON.parse(new TextDecoder('utf-8').decode(addUserResponse.Payload));

            if (addUserResponse.FunctionError) {
                throw new Error(addUserPayload.errorMessage || 'User creation in Cognito failed.');
            }

            newUserUuid = addUserPayload.user.uuid;
        }

        // Add the user as a member of the household
        const householdMember = await prisma.householdMembers.create({
            data: {
                id: uuidv4(),
                householdId: householdId,
                memberUuid: newUserUuid,
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
                userUuid: newUserUuid,
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
