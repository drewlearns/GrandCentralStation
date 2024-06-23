const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambdaClient.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload.isValid;
}

async function sendEmail(emailParams) {
    const command = new SendEmailCommand(emailParams);
    return sesClient.send(command);
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

    const { authorizationToken, email, householdId } = parsedBody;
    if (!authorizationToken || !email || !householdId) {
        console.log('Missing required fields');
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Missing required fields' }),
        };
    }

    try {
        const isValid = await verifyToken(authorizationToken);
        if (!isValid) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid token.' }),
            };
        }
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Token verification failed.' }),
        };
    }

    try {
        const household = await prisma.household.findUnique({ where: { householdId } });
        if (!household) {
            console.log(`Household ${householdId} not found`);
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Household not found" }),
            };
        }

        const userUUID = email;
        const existingUser = await prisma.user.findUnique({ where: { uuid: userUUID } });

        if (existingUser) {
            const isMember = await prisma.householdMembers.findFirst({
                where: { householdId, memberUuid: userUUID }
            });

            if (isMember) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: "User is already a member of the household." }),
                };
            }

            await prisma.householdMembers.create({
                data: {
                    householdId,
                    memberUuid: userUUID,
                    role: 'member',
                    joinedDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const emailParams = {
                Destination: { ToAddresses: [email] },
                Message: {
                    Body: { Text: { Charset: "UTF-8", Data: `You have been added to the household: ${household.householdName}.` } },
                    Subject: { Charset: 'UTF-8', Data: 'Household Membership' }
                },
                Source: 'noreply@app.thepurplepiggybank.com'
            };

            try {
                await sendEmail(emailParams);
            } catch (error) {
                console.error('Error sending email:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: "Error sending email", error: error.message }),
                };
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: "User added to household and email sent successfully" }),
            };
        } else {
            const newInvitation = await prisma.invitations.create({
                data: {
                    invitationId: uuidv4(),
                    householdId,
                    invitedUserEmail: email,
                    invitedUserUuid: null,
                    invitationStatus: 'Pending',
                    sentDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const emailParams = {
                Destination: { ToAddresses: [email] },
                Message: {
                    Body: { Text: { Charset: "UTF-8", Data: `You have been invited to join the household. Please click the link to accept the invitation: https://app.thepurplepiggybank.com/AcceptInvite. Invitation code: ${newInvitation.invitationId}` } },
                    Subject: { Charset: 'UTF-8', Data: 'Household Invitation' }
                },
                Source: 'noreply@app.thepurplepiggybank.com'
            };

            try {
                await sendEmail(emailParams);
            } catch (error) {
                console.error('Error sending email:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: "Error sending email", error: error.message }),
                };
            }

            return {
                statusCode: 201,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Invitation added and email sent successfully", invitation: newInvitation }),
            };
        }
    } catch (error) {
        console.error('Error handling request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Error processing request", error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
