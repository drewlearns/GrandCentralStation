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
  let authorizationToken;
  let refreshToken;
  const defaultPageSize = 30; // Default page size
  let page, pageSize; // Declare page and pageSize variables

  try {
    const parsedBody = JSON.parse(event.body);
    authorizationToken = parsedBody.authorizationToken;
    refreshToken = parsedBody.refreshToken;
    page = parsedBody.page || 1; // Default to page 1 if not provided
    pageSize = parsedBody.pageSize || defaultPageSize; // Default to defaultPageSize if not provided
  } catch (error) {
    console.error('Error parsing event body:', error);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid request body format',
        error: error.message,
      }),
    };
  }

  try {
    if (!authorizationToken || !refreshToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token or refresh token provided.',
        }),
      };
    }

    let userId;
    let tokenValid = false;

    // First attempt to verify the token
    try {
      userId = await verifyToken(authorizationToken);
      tokenValid = true;
    } catch (error) {
      console.error('Token verification failed, attempting refresh:', error.message);

      // Attempt to refresh the token and verify again
      try {
        const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
        userId = result.userId;
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

    // Fetch the households associated with the user, with pagination and selected fields
    const households = await prisma.household.findMany({
      where: {
        members: {
          some: {
            memberUuid: userId,
          },
        },
      },
      select: {
        householdId: true,
        householdName: true,
        creationDate: true,
        setupComplete: true,
        activeSubscription: true,
      },
      orderBy: {
        creationDate: 'desc',
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    if (households.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'No households found for the given user',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(households),
    };
  } catch (error) {
    console.error(`Error fetching households: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Error fetching households',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
