const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId, newThreshold, paymentSourceId, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Access denied. No token provided.' })
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
      body: JSON.stringify({ message: 'Invalid token.', error: error.message }),
    };
  }

  try {
    if (!householdId || newThreshold === undefined || !paymentSourceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing householdId, newThreshold, or paymentSourceId parameter" }),
      };
    }

    // Fetch the current threshold
    const currentThreshold = await prisma.threshold.findUnique({
      where: { householdId: householdId, paymentSourceId: paymentSourceId }
    });

    let oldValue = '';
    if (currentThreshold) {
      oldValue = currentThreshold.value;
    }

    // Update or create the threshold
    const thresholdRecord = await prisma.threshold.upsert({
      where: { householdId_paymentSourceId: { householdId: householdId, paymentSourceId: paymentSourceId } },
      update: { value: newThreshold, updatedAt: new Date() },
      create: {
        id: uuidv4(),
        householdId: householdId,
        paymentSourceId: paymentSourceId,
        value: newThreshold,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Log to audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Threshold',
        actionType: currentThreshold ? 'Update' : 'Create',
        oldValue: oldValue,
        newValue: JSON.stringify({ threshold: thresholdRecord }),
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
      body: JSON.stringify({ threshold: thresholdRecord }),
    };
  } catch (error) {
    console.error('Error setting threshold:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error setting threshold", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
