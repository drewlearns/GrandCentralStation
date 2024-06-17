const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
    const { authorizationToken, refreshToken, householdId } = JSON.parse(event.body);

    if (!authorizationToken || !refreshToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Access denied. No token or refresh token provided.'
            })
        };
    }

    let requestingUserUuid;
    let tokenValid = false;

    // First attempt to verify the token
    try {
        requestingUserUuid = await verifyToken(authorizationToken);
        tokenValid = true;
    } catch (error) {
        console.error('Token verification failed, attempting refresh:', error.message);

        // Attempt to refresh the token and verify again
        try {
            const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
            requestingUserUuid = result.userId;
            tokenValid = true;
        } catch (refreshError) {
            console.error('Token refresh and verification failed:', refreshError);
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Invalid token.',
                    error: refreshError.message,
                }),
            };
        }
    }

    if (!tokenValid) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid token.' }),
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
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        // Check if the requesting user is a member of the household
        const isMember = household.members.some(member => member.memberUuid === requestingUserUuid);

        if (!isMember) {
            return {
                statusCode: 403,
                headers: corsHeaders,
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
                member: true // Corrected relationship field
            }
        });

        const memberList = members.map(member => ({
            memberUuid: member.memberUuid,
            role: member.role,
            joinedDate: member.joinedDate,
            user: {
                username: member.member.username,
                firstName: member.member.firstName,
                lastName: member.member.lastName,
                email: member.member.email,
                phoneNumber: member.member.phoneNumber,
            }
        }));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Household members retrieved successfully',
                members: memberList
            }),
        };
    } catch (error) {
        console.error('Error retrieving household members:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error retrieving household members',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
