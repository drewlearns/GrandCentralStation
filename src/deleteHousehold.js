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
  const { authorizationToken, refreshToken, householdId } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let deletedBy;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    deletedBy = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      deletedBy = result.userId;
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
    const household = await prisma.household.findUnique({
      where: { householdId: householdId },
      include: {
        members: {
          where: {
            role: 'Owner',
          }
        }
      }
    });

    if (!household) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'Household not found',
        }),
      };
    }

    const owner = household.members.find(member => member.role === 'Owner');

    if (!owner || owner.memberUuid !== deletedBy) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: 'You are not authorized to delete this household',
        }),
      };
    }

    await prisma.$transaction(async (prisma) => {
      // Delete related data in the correct order to avoid foreign key constraint issues
      await prisma.attachments.deleteMany({
        where: {
          ledgerId: {
            in: (await prisma.ledger.findMany({
              where: { householdId: householdId },
              select: { ledgerId: true }
            })).map(ledger => ledger.ledgerId)
          }
        }
      });

      await prisma.transaction.deleteMany({
        where: {
          ledgerId: {
            in: (await prisma.ledger.findMany({
              where: { householdId: householdId },
              select: { ledgerId: true }
            })).map(ledger => ledger.ledgerId)
          }
        }
      });

      await prisma.householdMembers.deleteMany({ where: { householdId: householdId } });
      await prisma.incomes.deleteMany({ where: { householdId: householdId } });
      await prisma.ledger.deleteMany({ where: { householdId: householdId } });
      await prisma.bill.deleteMany({ where: { householdId: householdId } });
      await prisma.preferences.deleteMany({ where: { householdId: householdId } });
      await prisma.invitations.deleteMany({ where: { householdId: householdId } });
      await prisma.paymentSource.deleteMany({ where: { householdId: householdId } });

      // Now delete the household
      await prisma.household.delete({
        where: { householdId: householdId },
      });
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Household deleted successfully',
        householdId: householdId,
      }),
    };
  } catch (error) {
    console.error('Error deleting household:', error);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Error deleting household',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
