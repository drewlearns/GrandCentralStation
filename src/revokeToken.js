const { CognitoIdentityProviderClient, RevokeTokenCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { PrismaClient } = require('@prisma/client');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { authorizationToken, refreshToken } = JSON.parse(event.body);
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Authorization token and refresh token are required.' }),
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
      body: JSON.stringify({ message: 'Invalid token.', error: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const revokeTokenCommand = new RevokeTokenCommand({
      Token: refreshToken,
      ClientId: clientId,
      ClientSecret: clientSecret,
    });

    await cognitoClient.send(revokeTokenCommand);

    // Optionally, delete tokens from your database
    await prisma.token.deleteMany({
      where: {
        userUuid: username,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Token revoked successfully.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error revoking token:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to revoke token.', errorDetails: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
