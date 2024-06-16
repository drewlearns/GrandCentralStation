const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };

    let parsedBody;

    try {
        parsedBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid request body' }),
            headers: corsHeaders,
        };
    }

    const { invitationId, username, mailOptIn, firstName, lastName, phoneNumber, password } = parsedBody;

    // Validate required fields
    if (!invitationId || !username || !password || !firstName || !lastName || !phoneNumber) {
        console.error('Missing required fields');
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing required fields',
            }),
            headers: corsHeaders,
        };
    }

    try {
        console.log('Checking invitation...');
        // Check if the invitation exists and is still pending
        const invitation = await prisma.invitations.findUnique({
            where: { invitationId: invitationId },
        });

        if (!invitation) {
            console.error('Invitation not found');
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Invitation not found',
                }),
                headers: corsHeaders,
            };
        }

        if (invitation.invitationStatus !== 'Pending') {
            console.error('Invitation is not pending');
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Invitation is not pending',
                }),
                headers: corsHeaders,
            };
        }

        const { householdId, invitedUserEmail } = invitation;

        console.log('Checking if user exists...');
        // Check if the user with the same UUID already exists
        const existingUser = await prisma.user.findUnique({
            where: { uuid: invitedUserEmail }, // Using uuid (same as email) for unique lookup
        });

        let newUserUuid;
        if (existingUser) {
            console.log('User already exists, using existing UUID');
            newUserUuid = existingUser.uuid;
        } else {
            console.log('User does not exist, checking username...');
            // Check if the username is unique using findFirst
            const existingUserByUsername = await prisma.user.findFirst({
                where: { username: username },
            });

            if (existingUserByUsername) {
                console.error('Username is already taken');
                return {
                    statusCode: 409,
                    body: JSON.stringify({
                        message: 'Username is already taken',
                    }),
                };
            }

            console.log('Invoking addUser Lambda function...');
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

            try {
                const addUserResponse = await lambdaClient.send(addUserCommand);
                console.log('addUserResponse:', addUserResponse);

                const addUserPayload = JSON.parse(new TextDecoder('utf-8').decode(addUserResponse.Payload));
                console.log('addUserPayload:', addUserPayload);

                if (addUserResponse.FunctionError) {
                    console.error('User creation in Cognito failed:', addUserPayload.errorMessage);
                    throw new Error(addUserPayload.errorMessage || 'User creation in Cognito failed.');
                }

                if (!addUserPayload || !addUserPayload.user || !addUserPayload.user.uuid) {
                    throw new Error('Invalid response from addUser Lambda function.');
                }

                newUserUuid = addUserPayload.user.uuid;
                console.log('User created in Cognito, new UUID:', newUserUuid);
            } catch (error) {
                console.error('Error invoking addUser Lambda function:', error);
                throw error;
            }
        }

        console.log('Adding user to household...');
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

        console.log('Updating invitation status to accepted...');
        // Update the invitation status to accepted and set the invitedUserUuid
        await prisma.invitations.update({
            where: { invitationId: invitationId },
            data: {
                invitationStatus: 'Accepted',
                updatedAt: new Date(),
                invitedUserUuid: newUserUuid,
            },
        });

        console.log('Invitation accepted successfully');
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Invitation accepted successfully',
                householdMember: householdMember,
            }),
            headers: corsHeaders,
        };
    } catch (error) {
        console.error('Error accepting invitation:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error accepting invitation',
                error: error.message,
            }),
            headers: corsHeaders,
        };
    } finally {
        await prisma.$disconnect();
    }
};
