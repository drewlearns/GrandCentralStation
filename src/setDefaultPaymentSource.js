const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId, paymentSourceId, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
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
    if (!householdId || !paymentSourceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing householdId or paymentSourceId parameter" }),
      };
    }

    const preferenceType = 'defaultPaymentSource';
    const preferenceValue = paymentSourceId;

    const preference = await prisma.preferences.upsert({
      where: {
        householdId_preferenceType: {
          householdId: householdId,
          preferenceType: preferenceType
        }
      },
      update: { preferenceValue: preferenceValue },
      create: {
        preferenceId: uuidv4(),
        householdId: householdId,
        preferenceType: preferenceType,
        preferenceValue: preferenceValue,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Log to audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Preferences',
        actionType: 'Update',
        oldValue: '',
        newValue: JSON.stringify({ preference: preference }),
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
      body: JSON.stringify({ preference: preference }),
    };
  } catch (error) {
    console.error('Error setting default payment source:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error setting default payment source", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
