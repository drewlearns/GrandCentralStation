const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let authorizationToken, paymentSourceId, month, year, ipAddress, deviceDetails;

  try {
    const parsedBody = JSON.parse(event.body);
    authorizationToken = parsedBody.authorizationToken;
    paymentSourceId = parsedBody.paymentSourceId;
    month = parsedBody.month;
    year = parsedBody.year;
    ipAddress = parsedBody.ipAddress;
    deviceDetails = parsedBody.deviceDetails;
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

    if (!month || !year) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing month or year in the request',
        }),
      };
    }

    // Calculate the start and end dates for the given month and year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    console.log(`Fetching ledger entries for paymentSourceId: ${paymentSourceId} between: ${startDate} and ${endDate}`);

    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        paymentSourceId: paymentSourceId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
      select: {
        transactionDate: true,
        runningTotal: true,
      },
    });

    console.log(`Ledger entries fetched: ${JSON.stringify(ledgerEntries)}`);

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'No ledger entries found for the given payment source in the specified date range',
        }),
      };
    }

    // Add logging for audit trail data
    const auditData = {
      auditId: uuidv4(),
      tableAffected: 'Ledger',
      actionType: 'Read',
      oldValue: '',
      newValue: JSON.stringify(ledgerEntries),
      changedBy: updatedBy,
      changeDate: new Date(),
      timestamp: new Date(),
      device: deviceDetails,
      ipAddress: ipAddress,
      deviceType: '',
      ssoEnabled: 'false',
    };
    console.log(`Audit trail data: ${JSON.stringify(auditData)}`);

    // Log the audit trail
    await prisma.auditTrail.create({
      data: auditData,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        paymentSourceId: paymentSourceId,
        ledgerEntries: ledgerEntries,
      }),
    };
  } catch (error) {
    console.error(`Error fetching running totals: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error fetching running totals',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
