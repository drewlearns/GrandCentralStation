const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let authorizationToken, householdId;

  try {
    const parsedBody = JSON.parse(event.body);
    authorizationToken = parsedBody.authorizationToken;
    householdId = parsedBody.householdId;

    if (!householdId) {
      throw new Error('householdId is required.');
    }
  } catch (error) {
    console.error('Error parsing event body:', error);
    return {
      statusCode: 400,
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
      console.log(`Verified user ID: ${userId}`);
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

    // Fetch the household by ID and check if the user is a member
    const household = await prisma.household.findUnique({
      where: { householdId },
      include: {
        members: true,
        incomes: true,
        bills: true,
        preferences: true,
        invitations: true,
        paymentSources: true,
        users: true,
        ledger: {
          where: {
            transactionDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            },
          },
          orderBy: {
            transactionDate: 'asc',
          },
        },
      },
    });

    if (!household) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'Household not found',
        }),
      };
    }

    const isMember = household.members.some(member => member.memberUuid === userId);
    if (!isMember) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: 'Access denied. You are not a member of this household.',
        }),
      };
    }

    // Extract paymentSourceIds and invoke getRunningTotal.js for each
    const paymentSourceIds = household.paymentSources.map(ps => ps.sourceId);
    const runningTotals = await Promise.all(paymentSourceIds.map(async (paymentSourceId) => {
      const getRunningTotalCommand = new InvokeCommand({
        FunctionName: 'getRunningTotal',
        Payload: JSON.stringify({ authorizationToken, paymentSourceId }),
      });
      const getRunningTotalResponse = await lambdaClient.send(getRunningTotalCommand);
      const runningTotalPayload = JSON.parse(new TextDecoder('utf-8').decode(getRunningTotalResponse.Payload));

      if (getRunningTotalResponse.FunctionError) {
        throw new Error(runningTotalPayload.errorMessage || 'Error invoking getRunningTotal function.');
      }

      return {
        paymentSourceId,
        runningTotal: runningTotalPayload.runningTotal,
      };
    }));

    // Attach running totals to household response
    household.paymentSources.forEach(paymentSource => {
      const runningTotal = runningTotals.find(rt => rt.paymentSourceId === paymentSource.sourceId);
      paymentSource.runningTotal = runningTotal ? runningTotal.runningTotal : null;
    });

    return {
      statusCode: 200,
      body: JSON.stringify(household),
    };
  } catch (error) {
    console.error(`Error fetching household: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error fetching household',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
