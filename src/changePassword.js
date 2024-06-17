const { PrismaClient } = require('@prisma/client');
const { CognitoIdentityProviderClient, ChangePasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

function generateSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

exports.handler = async (event) => {
  const { username, oldPassword, newPassword, authorizationToken, refreshToken } = JSON.parse(event.body);
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

  let tokenValid = false;
  let updatedBy = username;

  // First attempt to verify the token
  try {
    await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      updatedBy = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
      };
    }
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.' }),
    };
  }

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
        headers: corsHeaders,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // Check if the account status is not 'trial' or 'active'
    if (user.subscriptionStatus !== 'trial' && user.subscriptionStatus !== 'active') {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Account is not in trial or active status' }),
      };
    }

    // Change the password
    return await changePassword(accessToken, oldPassword, newPassword);
  } catch (error) {
    console.error('Error during password change:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error', errorDetails: error.message }),
    };
  }
};

async function changePassword(accessToken, oldPassword, newPassword) {
  const params = {
    AccessToken: accessToken,
    PreviousPassword: oldPassword,
    ProposedPassword: newPassword,
  };

  try {
    await client.send(new ChangePasswordCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Password changed successfully' }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error('Password change error:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Password change failed',
        errorDetails: error.message,
      }),
      headers: corsHeaders,
    };
  }
}
