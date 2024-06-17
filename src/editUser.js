const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminCreateUserCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, refreshToken, email, phoneNumber, newUsername } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
      headers: corsHeaders,
    };
  }

  let username;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    username = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      username = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
        headers: corsHeaders,
      };
    }
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token.' }),
      headers: corsHeaders,
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
        headers: corsHeaders,
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User updated successfully',
        user: updatedUser,
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update user', errorDetails: error.message }),
      headers: corsHeaders,
    };
  } finally {
    await prisma.$disconnect();
  }
};
