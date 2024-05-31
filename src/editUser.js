const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminCreateUserCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, email, phoneNumber, newUsername, ipAddress, deviceDetails } = JSON.parse(event.body);

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
      where: { uuid: username },
    });

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Create new user in Cognito with new username
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: newUsername,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'phone_number', Value: phoneNumber },
        // Add other attributes as needed
      ],
      DesiredDeliveryMediums: ['EMAIL'],
    });

    await cognitoClient.send(createUserCommand);

    // Update the new user in your database
    const updatedUser = await prisma.user.update({
      where: { uuid: username },
      data: {
        uuid: newUsername,
        email: email,
        phoneNumber: phoneNumber,
        updatedAt: new Date(),
      },
    });

    // Delete old user in Cognito
    const deleteUserCommand = new AdminDeleteUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: username,
    });

    await cognitoClient.send(deleteUserCommand);

    // Log the update operation in the audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'User',
        actionType: 'Update',
        oldValue: JSON.stringify(user),
        newValue: JSON.stringify(updatedUser),
        changedBy: newUsername,
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
        message: 'User updated successfully',
        user: updatedUser,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update user', errorDetails: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
};
