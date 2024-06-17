const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
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
      }),
    };
  }

  let username;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    username = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      username = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Invalid token.',
          error: refreshError.message,
        }),
        headers: corsHeaders,
      };
    }
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token.' }),
      headers: corsHeaders,
    };
  }

  if (!householdId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing householdId parameter" }),
      headers: corsHeaders,
    };
  }

  try {
    const currentDate = new Date();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const allBills = await prisma.bill.findMany({
      where: {
        householdId: householdId,
        ledgers: {
          some: {
            transactionDate: {
              lte: endOfMonth
            }
          }
        }
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'All bills retrieved successfully',
        allBills: allBills
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error('Error fetching all bills:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve all bills',
        errorDetails: error.message,
      }),
      headers: corsHeaders,
    };
  } finally {
    await prisma.$disconnect();
  }
};
