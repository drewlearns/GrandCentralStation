const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  let username;
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
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        uuid: username,
      },
      include: {
        households: true,
        householdMembers: true,
        invited: true,
        audits: true,
        securityLogs: true,
        notifications: true,
        tokens: true,
      },
    });

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Log the read operation in the audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'User',
        actionType: 'Read',
        oldValue: '',
        newValue: JSON.stringify(user),
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
      body: JSON.stringify(user),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error fetching user:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch user', errorDetails: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
};
