const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, month, year, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!month || !year) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing month or year parameter" }),
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

    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        ledger: true,
        source: true
      }
    });

    if (transactions.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No transactions found for the specified month" }),
      };
    }

    // Log to audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Transaction',
        actionType: 'Read',
        oldValue: '',
        newValue: JSON.stringify({ transactions: transactions }),
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
      body: JSON.stringify({ transactions: transactions }),
    };
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving transactions", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
