const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
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
  const { username, password, mfaCode, session } = JSON.parse(event.body);
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        uuid: username,
      },
    });

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
        headers: corsHeaders,
      };
    }

    if (user.subscriptionStatus !== 'trial' && user.subscriptionStatus !== 'active') {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Account is not in trial or active status' }),
        headers: corsHeaders,
      };
    }

    if (!session) {
      return initiateAuth(username, password, clientId, clientSecret, corsHeaders);
    } else {
      return respondToMFASetupChallenge(
        username,
        mfaCode,
        session,
        clientId,
        clientSecret,
        corsHeaders,
      );
    }
  } catch (error) {
    console.error('Error during login:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', errorDetails: error.message }),
      headers: corsHeaders,
    };
  }
};

function initiateAuth(username, password, clientId, clientSecret, corsHeaders) {
  const authParameters = {
    USERNAME: username,
    PASSWORD: password,
  };

  if (clientSecret) {
    authParameters.SECRET_HASH = generateSecretHash(username, clientId, clientSecret);
  }

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: authParameters,
  };

  return client
    .send(new InitiateAuthCommand(params))
    .then((response) => handleAuthResponse(response, corsHeaders))
    .catch((error) => {
      console.error('Authentication error:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Authentication failed',
          errorDetails: error.message,
        }),
        headers: corsHeaders,
      };
    });
}

function respondToMFASetupChallenge(username, mfaCode, session, clientId, clientSecret, corsHeaders) {
  const challengeResponses = {
    USERNAME: username,
    SECRET_HASH: generateSecretHash(username, clientId, clientSecret),
    SOFTWARE_TOKEN_MFA_CODE: mfaCode
  };

  const params = {
    ChallengeName: 'SOFTWARE_TOKEN_MFA',
    ClientId: clientId,
    ChallengeResponses: challengeResponses,
    Session: session,
  };

  return client
    .send(new RespondToAuthChallengeCommand(params))
    .then((response) => handleAuthResponse(response, corsHeaders))
    .catch((error) => {
      console.error('MFA setup error:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Failed to setup MFA',
          errorDetails: error.message,
        }),
        headers: corsHeaders,
      };
    });
}

function handleAuthResponse(response, corsHeaders) {
  if (response.AuthenticationResult) {
    const tokens = response.AuthenticationResult;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Authentication successful',
        tokens: tokens,
      }),
      headers: corsHeaders,
    };
  } else if (response.ChallengeName) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'MFA challenge required',
        challengeName: response.ChallengeName,
        session: response.Session,
      }),
      headers: corsHeaders,
    };
  } else {
    return {
      statusCode: 204,
      body: JSON.stringify({ message: 'Unexpected response' }),
      headers: corsHeaders,
    };
  }
}
