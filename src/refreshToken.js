const { PrismaClient } = require('@prisma/client');
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const crypto = require('crypto');

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

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
    console.error('Access denied. No token provided.');
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
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
      console.error('Token verification failed:', payload.errorMessage || 'Token verification failed.');
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    username = payload.username;
    if (!username) {
      throw new Error('Token verification did not return a valid username.');
    }
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        uuid: username,
      },
    });

    if (!user) {
      console.error('User not found:', username);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
        headers: corsHeaders,
      };
    }

    if (user.subscriptionStatus !== 'trial' && user.subscriptionStatus !== 'active') {
      console.error('Account is not in trial or active status:', username);
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Account is not in trial or active status' }),
        headers: corsHeaders,
      };
    }

    return await initiateRefreshTokenFlow(username, refreshToken, clientId, clientSecret);
  } catch (error) {
    console.error('Error during token refresh:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', errorDetails: error.message }),
      headers: corsHeaders,
    };
  } finally {
    await prisma.$disconnect();
  }
};

async function initiateRefreshTokenFlow(username, refreshToken, clientId, clientSecret) {
  const authParameters = {
    REFRESH_TOKEN: refreshToken,
  };

  if (clientSecret) {
    authParameters.SECRET_HASH = generateSecretHash(username, clientId, clientSecret);
  }

  const params = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: clientId,
    AuthParameters: authParameters,
  };

  try {
    const response = await cognitoClient.send(new InitiateAuthCommand(params));
    return await handleRefreshResponse(response, username, refreshToken);
  } catch (error) {
    console.error('Refresh token error:', error.message);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Token refresh failed',
        errorDetails: error.message,
      }),
      headers: corsHeaders,
    };
  }
}

async function handleRefreshResponse(response, username, originalRefreshToken) {
  if (response.AuthenticationResult) {
    const tokens = response.AuthenticationResult;
    const { AccessToken, RefreshToken, IdToken, ExpiresIn } = tokens;

    // Use the original refresh token if a new one is not provided
    const refreshTokenToStore = RefreshToken || originalRefreshToken;

    if (!AccessToken || !IdToken || !ExpiresIn || !refreshTokenToStore) {
      console.error('Missing tokens in the response:', tokens);
      return {
        statusCode: 204,
        body: JSON.stringify({ message: 'Unexpected response: Missing required tokens' }),
        headers: corsHeaders,
      };
    }

    // Calculate the expiration timestamp
    const expiresAt = new Date(Date.now() + ExpiresIn * 1000).toISOString();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Token refresh successful',
        tokens: {
          AccessToken,
          RefreshToken: refreshTokenToStore,
          IdToken,
          ExpiresIn: expiresAt,
        },
      }),
      headers: corsHeaders,
    };
  } else {
    console.error('Unexpected response:', response);
    return {
      statusCode: 204,
      body: JSON.stringify({ message: 'Unexpected response' }),
      headers: corsHeaders,
    };
  }
}
