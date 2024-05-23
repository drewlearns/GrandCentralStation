const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId, month, year, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!householdId || !month || !year) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing householdId, month or year parameter" }),
    };
  }

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken })
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    username = payload.username;
    if (!username) {
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

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        bill: true,
        income: true,
        transactions: true
      }
    });

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No ledger entries found for the specified month" }),
      };
    }

    // Log to audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Ledger',
        actionType: 'Read',
        oldValue: '',
        newValue: JSON.stringify({ ledgerEntries: ledgerEntries }),
        changedBy: username,
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
      body: JSON.stringify({ ledgerEntries: ledgerEntries }),
    };
  } catch (error) {
    console.error('Error retrieving ledger entries:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving ledger entries", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
