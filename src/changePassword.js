const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  CognitoIdentityProviderClient,
  ChangePasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

function generateSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

exports.handler = async (event) => {
  const { username, oldPassword, newPassword } = JSON.parse(event.body);
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
  const accessToken = event.headers.Authorization;

  try {
    // Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: {
        uuid: username,
      },
    });

    // Check if user exists
    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Check if the account status is not 'trial' or 'active'
    if (user.subscriptionStatus !== 'trial' && user.subscriptionStatus !== 'active') {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Account is not in trial or active status' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Change the password
    return changePassword(accessToken, oldPassword, newPassword);
  } catch (error) {
    console.error('Error during password change:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', errorDetails: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

function changePassword(accessToken, oldPassword, newPassword) {
  const params = {
    AccessToken: accessToken,
    PreviousPassword: oldPassword,
    ProposedPassword: newPassword,
  };

  return client
    .send(new ChangePasswordCommand(params))
    .then((response) => {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Password changed successfully' }),
        headers: { 'Content-Type': 'application/json' },
      };
    })
    .catch((error) => {
      console.error('Password change error:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Password change failed',
          errorDetails: error.message,
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });
}
