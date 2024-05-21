const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const { authorizationToken, householdId } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }

    let requestingUserUuid;

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

        requestingUserUuid = payload.username;
        if (!requestingUserUuid) {
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
                members: true
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

        // Check if the requesting user is a member of the household
        const isMember = household.members.some(member => member.memberUuid === requestingUserUuid);

        if (!isMember) {
            console.log(`Error: User ${requestingUserUuid} is not a member of household ${householdId}`);
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: 'You do not have permission to view members of this household',
                }),
            };
        }

        // List members in the household
        const members = await prisma.householdMembers.findMany({
            where: {
                householdId: householdId,
            },
            include: {
                user: true
            }
        });

        const memberList = members.map(member => ({
            memberUuid: member.memberUuid,
            role: member.role,
            joinedDate: member.joinedDate,
            user: {
                username: member.user.username,
                firstName: member.user.firstName,
                lastName: member.user.lastName,
                email: member.user.email,
                phoneNumber: member.user.phoneNumber,
            }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Household members retrieved successfully',
                members: memberList
            }),
        };
    } catch (error) {
        console.error('Error retrieving household members:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error retrieving household members',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
