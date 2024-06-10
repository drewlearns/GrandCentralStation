const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {

  let authorizationToken, ipAddress, deviceDetails;
  const defaultPageSize = 30; // Default page size
  let page, pageSize; // Declare page and pageSize variables

  try {
    const parsedBody = JSON.parse(event.body);
    authorizationToken = parsedBody.authorizationToken;
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
    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.',
        }),
      };
    }

    let userId;

    // Verify the token and get the user ID
    try {
      const verifyTokenCommand = new InvokeCommand({
        FunctionName: 'verifyToken',
        Payload: JSON.stringify({ authorizationToken }),
      });

      const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
      const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

      if (verifyTokenResponse.FunctionError) {
        throw new Error(payload.errorMessage || 'Token verification failed.');
      }

      userId = payload.username;
      if (!userId) {
        throw new Error('Token verification did not return a valid user ID.');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Invalid token.',
          error: error.message,
        }),
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
