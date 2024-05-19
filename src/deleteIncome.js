const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, incomeId, ipAddress, deviceDetails } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;

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

    const incomeExists = await prisma.incomes.findUnique({
      where: { incomeId: incomeId },
    });

    if (!incomeExists) {
      console.log(`Error: Income ${incomeId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Income not found" }),
      };
    }

    await prisma.ledger.deleteMany({
      where: { incomeId: incomeId },
    });

    await prisma.incomes.delete({
      where: { incomeId: incomeId },
    });

    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Incomes',
        actionType: 'Delete',
        oldValue: JSON.stringify(incomeExists),
        newValue: '',
        changedBy: updatedBy,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    console.log(`Success: Income and ledger entries deleted for income ${incomeId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Income and ledger entries deleted successfully",
      }),
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
