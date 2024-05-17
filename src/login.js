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

function handleAuthResponse(response, username, ipAddress, deviceDetails, locationDetails) {
  if (response.AuthenticationResult) {
    logSecurityEvent(username, ipAddress, deviceDetails, locationDetails, 'Login').catch(console.error);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Authentication successful',
        tokens: response.AuthenticationResult,
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

async function logSecurityEvent(username, ipAddress, deviceDetails, locationDetails) {
  try {
    const securityLogEntry = await prisma.securityLog.create({
      data: {
        userUuid: username,
        loginTime: new Date(),
        ipAddress: ipAddress,
        deviceDetails: deviceDetails,
        locationDetails: locationDetails,
        actionType: login,
        createdAt: new Date(),
      },
    });
    console.log('Logged security event for user:', username);
  } catch (error) {
    console.error('Error logging security event:', error);
    throw error;
  }
}
