const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, paymentSourceId, ipAddress, deviceDetails } = event;

  try {
    if (!authorizationToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.',
        }),
      };
    }

    let updatedBy;

    // Verify the token
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

      updatedBy = payload.username;
      if (!updatedBy) {
        throw new Error('Token verification did not return a valid username.');
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

    if (!paymentSourceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing paymentSourceId in the request',
        }),
      };
    }

    // Fetch the latest ledger entry for the given payment source to get the current running total
    const latestLedgerEntry = await prisma.ledger.findFirst({
      where: { paymentSourceId: paymentSourceId },
      orderBy: { transactionDate: 'desc' },
      select: { runningTotal: true },
    });

    if (!latestLedgerEntry) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'No ledger entries found for the given payment source',
        }),
      };
    }

    // Log the audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Ledger',
        actionType: 'Read',
        oldValue: '',
        newValue: JSON.stringify(latestLedgerEntry),
        changedBy: updatedBy,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        paymentSourceId: paymentSourceId,
        runningTotal: latestLedgerEntry.runningTotal,
      }),
    };
  } catch (error) {
    console.error(`Error fetching running total: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error fetching running total',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
