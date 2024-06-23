const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function invokeAddUserLambda(userData) {
    const params = {
        FunctionName: 'addUser',
        Payload: new TextEncoder().encode(JSON.stringify({ body: JSON.stringify(userData) })),
    };

    const command = new InvokeCommand(params);
    const response = await lambdaClient.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (response.FunctionError || !payload || !payload.body) {
        throw new Error('Invalid response from addUser Lambda function.');
    }

    const body = JSON.parse(payload.body);
    if (!body.user || !body.user.uuid) {
        throw new Error('Invalid user data in addUser response.');
    }

    return body.user.uuid;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { invitationId, username, mailOptIn, firstName, lastName, phoneNumber, password } = parsedBody;

    // Validate required fields
    if (!invitationId || !username || !password || !firstName || !lastName || !phoneNumber) {
        console.error('Missing required fields');
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Missing required fields' }),
        };
    }

    try {
        // Check if the invitation exists and is still pending
        const invitation = await prisma.invitations.findUnique({ where: { invitationId } });

        if (!invitation) {
            console.error('Invitation not found');
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invitation not found' }),
            };
        }

        if (invitation.invitationStatus !== 'Pending') {
            console.error('Invitation is not pending');
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invitation is not pending' }),
            };
        }

        const { householdId, invitedUserEmail } = invitation;

        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({ where: { uuid: invitedUserEmail } });

        let newUserUuid;
        if (existingUser) {
            newUserUuid = existingUser.uuid;
        } else {
            // Check if the username is unique
            const existingUserByUsername = await prisma.user.findFirst({ where: { username } });

            if (existingUserByUsername) {
                console.error('Username is already taken');
                return {
                    statusCode: 409,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Username is already taken' }),
                };
            }

            // Invoke addUser Lambda function
            try {
                newUserUuid = await invokeAddUserLambda({
                    username,
                    email: invitedUserEmail,
                    password,
                    mailOptIn,
                    phoneNumber,
                    firstName,
                    lastName,
                });
            } catch (error) {
                console.error('Error invoking addUser Lambda function:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Error creating user', error: error.message }),
                };
            }
        }

        // Add the user as a member of the household
        const householdMember = await prisma.householdMembers.create({
            data: {
                id: uuidv4(),
                householdId,
                memberUuid: newUserUuid,
                role: 'Member', // Adjust the role as needed
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Update the invitation status to accepted and set the invitedUserUuid
        await prisma.invitations.update({
            where: { invitationId },
            data: {
                invitationStatus: 'Accepted',
                updatedAt: new Date(),
                invitedUserUuid: newUserUuid,
            },
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invitation accepted successfully', householdMember }),
        };
    } catch (error) {
        console.error('Error accepting invitation:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Error accepting invitation', error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
