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
  const { username, password, mfaCode, session, ipAddress, deviceDetails, locationDetails } = JSON.parse(event.body);
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

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

    if (!session) {
      // First attempt to authenticate
      return initiateAuth(username, password, clientId, clientSecret, ipAddress, deviceDetails, locationDetails);
    } else {
      // Respond to MFA challenge
      return respondToMFASetupChallenge(
        username,
        mfaCode,
        session,
        clientId,
        clientSecret,
        ipAddress,
        deviceDetails,
        locationDetails
      );
    }
  } catch (error) {
    console.error('Error during login:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', errorDetails: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

function initiateAuth(username, password, clientId, clientSecret, ipAddress, deviceDetails, locationDetails) {
  const authParameters = {
    USERNAME: username,
    PASSWORD: password,
  };

  // Add SECRET_HASH to the parameters if client secret is used
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
    .then((response) => handleAuthResponse(response, username, ipAddress, deviceDetails, locationDetails))
    .catch((error) => {
      console.error('Authentication error:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Authentication failed',
          errorDetails: error.message,
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });
}

function respondToMFASetupChallenge(username, mfaCode, session, clientId, clientSecret, ipAddress, deviceDetails, locationDetails) {
  const challengeResponses = {
    USERNAME: username,
    SECRET_HASH: generateSecretHash(username, clientId, clientSecret),
    SOFTWARE_TOKEN_MFA_CODE: mfaCode,
  };

  const params = {
    ChallengeName: 'SOFTWARE_TOKEN_MFA',
    ClientId: clientId,
    ChallengeResponses: challengeResponses,
    Session: session,
  };

  return client
    .send(new RespondToAuthChallengeCommand(params))
    .then((response) => handleAuthResponse(response, username, ipAddress, deviceDetails, locationDetails))
    .catch((error) => {
      console.error('MFA setup error:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Failed to setup MFA',
          errorDetails: error.message,
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });
}

async function handleAuthResponse(response, username, ipAddress, deviceDetails, locationDetails) {
  if (response.AuthenticationResult) {
    const tokens = response.AuthenticationResult;
    await logSecurityEvent(username, ipAddress, deviceDetails, locationDetails, 'Login');
    await storeTokens(username, tokens);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Authentication successful',
        tokens: tokens,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } else if (response.ChallengeName) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'MFA challenge required',
        challengeName: response.ChallengeName,
        session: response.Session,
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

async function logSecurityEvent(username, ipAddress, deviceDetails, locationDetails, actionType) {
  try {
    await prisma.securityLog.create({
      data: {
        logId: crypto.randomUUID(),
        userUuid: username,
        loginTime: new Date(),
        ipAddress,
        deviceDetails,
        locationDetails,
        actionType,
        createdAt: new Date(),
      },
    });
    console.log('Logged security event for user:', username);
  } catch (error) {
    console.error('Error logging security event:', error);
    throw error;
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
