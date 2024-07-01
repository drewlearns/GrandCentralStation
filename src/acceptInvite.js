const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function invokeAddUserLambda(userData) {
    const params = {
        FunctionName: 'addUser',
        Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify(userData),
            httpMethod: 'POST'
        })),
    };

    const command = new InvokeCommand(params);
    const response = await lambdaClient.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    // Log the response from addUser Lambda function
    console.log('addUser Lambda function response:', response);
    console.log('addUser Lambda function payload:', payload);

    if (response.FunctionError || !payload || !payload.body) {
        throw new Error('Invalid response from addUser Lambda function.');
    }

    const body = JSON.parse(payload.body);
    console.log('Parsed body from addUser Lambda function:', body);
    
    if (!body.user || !body.user.uuid) {
        throw new Error('Invalid user data in addUser response.');
    }

    return body.user.uuid;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { invitationId, email, mailOptIn, firstName, lastName, uuid } = parsedBody;

    // Log parsedBody for debugging
    console.log('Parsed request body:', parsedBody);

    // Validate required fields
    if (!invitationId || !email || !firstName || !lastName || !uuid) {
        console.error('Missing required fields', { invitationId, email, mailOptIn, firstName, lastName, uuid });
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Missing required fields', missingFields: { invitationId, email, mailOptIn, firstName, lastName, uuid } }),
        };
    }

    try {
        const invitation = await prisma.invitations.findUnique({ where: { invitationId } });

        if (!invitation) {
            console.error('Invitation not found');
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invitation not found' }),
            };
        }

        if (invitation.invitationStatus !== 'Pending') {
            console.error('Invitation is not pending');
            return {
                statusCode: 409,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invitation is not pending' }),
            };
        }

        const { householdId, invitedUserEmail } = invitation;

        const existingUser = await prisma.user.findUnique({ where: { email: invitedUserEmail } });

        let newUserUuid;
        if (existingUser) {
            newUserUuid = existingUser.uuid;
        } else {
            const existingUserByEmail = await prisma.user.findUnique({ where: { email } });

            if (existingUserByEmail) {
                console.error('Email is already taken');
                return {
                    statusCode: 409,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Email is already taken' }),
                };
            }

            try {
                newUserUuid = await invokeAddUserLambda({
                    email,
                    mailOptIn,
                    firstName,
                    lastName,
                    uuid
                });
            } catch (error) {
                console.error('Error invoking addUser Lambda function:', error);
                return {
                    statusCode: 500,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Error creating user', error: error.message }),
                };
            }
        }

        const householdMember = await prisma.householdMembers.create({
            data: {
                id: uuidv4(),
                householdId,
                memberUuid: newUserUuid,
                role: 'Member',
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

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
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invitation accepted successfully', householdMember }),
        };
    } catch (error) {
        console.error('Error accepting invitation:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Error accepting invitation', error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
