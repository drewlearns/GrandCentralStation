const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { verifyToken } = require('./tokenUtils');
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
  const { authorizationToken, refreshToken, householdId, memberUuid } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let removingUserUuid;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    removingUserUuid = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      removingUserUuid = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
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

    // Check if the removing user is an owner of the household
    const isOwner = household.members.some(member => member.memberUuid === removingUserUuid && member.role === 'Owner');

    if (!isOwner) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'You do not have permission to remove members from this household',
        }),
      };
    }

    // Check if the member exists in the household
    const membership = await prisma.householdMembers.findFirst({
      where: {
        householdId: householdId,
        memberUuid: memberUuid,
      },
    });

    if (!membership) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'User is not a member of the household',
        }),
      };
    }

    // Delete the member from the household
    await prisma.householdMembers.delete({
      where: {
        id: membership.id,
      },
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Household member removed successfully',
      }),
    };
  } catch (error) {
    console.error('Error removing household member:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Error removing household member',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
