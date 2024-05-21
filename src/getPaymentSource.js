const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, sourceId, householdId, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let deletedBy;

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

    deletedBy = payload.username;
    if (!deletedBy) {
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
    const paymentSource = await prisma.paymentSource.findUnique({
      where: { sourceId: sourceId },
    });

    if (!paymentSource) {
      console.log(`Error: Payment source ${sourceId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" }),
      };
    }

    if (paymentSource.householdId !== householdId) {
      console.log(`Error: Payment source ${sourceId} does not belong to household ${householdId}`);
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: 'You do not have permission to delete this payment source',
        }),
      };
    }

    const deletedPaymentSource = await prisma.paymentSource.delete({
      where: { sourceId: sourceId },
    });

    const auditTrail = await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'paymentSource',
        actionType: 'Delete',
        oldValue: JSON.stringify(deletedPaymentSource),
        newValue: '',
        changedBy: deletedBy,
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
        message: "Payment source deleted successfully",
        paymentSource: deletedPaymentSource,
      }),
    };
  } catch (error) {
    console.error(`Error deleting payment source: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error deleting payment source",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
