const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let authorizationToken, ipAddress, deviceDetails;
  const pageSize = 30; // Adjust the page size as needed
  let page; // Declare the page variable

  try {
    const parsedBody = JSON.parse(event.body);
    authorizationToken = parsedBody.authorizationToken;
    ipAddress = parsedBody.ipAddress;
    deviceDetails = parsedBody.deviceDetails;
    page = parsedBody.page || 1; // Default to page 1 if not provided
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

    // Fetch the households associated with the user
    const households = await prisma.household.findMany({
      where: {
        members: {
          some: {
            memberUuid: userId,
          },
        },
      },
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
          take: pageSize,
          skip: (page - 1) * pageSize,
        },
      },
    });

    console.log(`Households found: ${JSON.stringify(households)}`);

    if (households.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'No households found for the given user',
        }),
      };
    }

    // Extract paymentSourceIds and invoke getRunningTotal.js for each
    const paymentSourceIds = households.flatMap(household => household.paymentSources.map(ps => ps.sourceId));
    const runningTotals = await Promise.all(paymentSourceIds.map(async (paymentSourceId) => {
      const getRunningTotalCommand = new InvokeCommand({
        FunctionName: 'getRunningTotal',
        Payload: JSON.stringify({ authorizationToken, paymentSourceId, ipAddress, deviceDetails }),
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

    // Attach running totals to households response
    households.forEach(household => {
      household.paymentSources.forEach(paymentSource => {
        const runningTotal = runningTotals.find(rt => rt.paymentSourceId === paymentSource.sourceId);
        paymentSource.runningTotal = runningTotal ? runningTotal.runningTotal : null;
      });
    });

    // Prepare audit trail data
    const auditData = {
      auditId: uuidv4(),
      tableAffected: 'Household',
      actionType: 'Read',
      oldValue: '',
      newValue: JSON.stringify(households),
      changedBy: userId,
      changeDate: new Date(),
      timestamp: new Date(),
      device: deviceDetails,
      ipAddress: ipAddress,
      deviceType: '',
      ssoEnabled: 'false',
    };

    // Log the audit trail
    await prisma.auditTrail.create({
      data: auditData,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(households),
    };
  } catch (error) {
    console.error(`Error fetching households: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error fetching households',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};