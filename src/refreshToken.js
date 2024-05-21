const { PrismaClient } = require('@prisma/client');
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const crypto = require('crypto');

const prisma = new PrismaClient();
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

function generateSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

exports.handler = async (event) => {
  const { refreshToken, authorizationToken } = JSON.parse(event.body);
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

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

    // Initiate the refresh token flow
    return initiateRefreshTokenFlow(username, refreshToken, clientId, clientSecret);
  } catch (error) {
    console.error('Error during token refresh:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', errorDetails: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

function initiateRefreshTokenFlow(username, refreshToken, clientId, clientSecret) {
  const authParameters = {
    REFRESH_TOKEN: refreshToken,
  };

  // Add SECRET_HASH to the parameters if client secret is used
  if (clientSecret) {
    authParameters.SECRET_HASH = generateSecretHash(username, clientId, clientSecret);
  }

  const params = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: clientId,
    AuthParameters: authParameters,
  };

  return cognitoClient
    .send(new InitiateAuthCommand(params))
    .then((response) => handleRefreshResponse(response, username))
    .catch((error) => {
      console.error('Refresh token error:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Token refresh failed',
          errorDetails: error.message,
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });
}

async function handleRefreshResponse(response, username) {
  if (response.AuthenticationResult) {
    const tokens = response.AuthenticationResult;
    await storeTokens(username, tokens);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Token refresh successful',
        tokens: tokens,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } else {
    return {
      statusCode: 204,
      body: JSON.stringify({ message: 'Unexpected response' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
}

async function storeTokens(username, tokens) {
  try {
    await prisma.token.create({
      data: {
        tokenId: crypto.randomUUID(),
        userUuid: username,
        accessToken: tokens.AccessToken,
        refreshToken: tokens.RefreshToken,
        idToken: tokens.IdToken,
        issuedAt: new Date(),
        expiresIn: tokens.ExpiresIn,
        token: tokens.IdToken, // Assuming token is idToken
        type: 'access', // Example value, adjust as necessary
      },
    });
    console.log('Stored tokens for user:', username);
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
}
