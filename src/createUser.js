const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { CognitoIdentityProviderClient, SignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  const { username, email, password, mailOptIn, phoneNumber, firstName, lastName } = JSON.parse(event.body);
  const mailOptInValue = mailOptIn === 'true';
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
  const secretHash = generateSecretHash(username, clientId, clientSecret);

  try {
    // Check if a user with the same uuid/username already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        uuid: username, // Assuming 'uuid' is used as 'username' in your user model
      },
    });

    if (existingUser) {
      return {
        statusCode: 409, // HTTP status code for 'Conflict'
        body: JSON.stringify({
          message: 'User with this UUID already exists.',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const signUpParams = {
      ClientId: clientId,
      SecretHash: secretHash,
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'phone_number', Value: phoneNumber },
        // Include any other required attributes here
      ],
    };

    const signUpResponse = await cognitoClient.send(new SignUpCommand(signUpParams));
    const newUser = await prisma.user.create({
      data: {
        uuid: username,
        username,
        email,
        phoneNumber,
        firstName,
        lastName,
        createdAt: new Date(),
        signupDate: new Date(),
        updatedAt: new Date(),
        confirmed_email: false,
        mailOptIn: mailOptInValue,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User registered successfully', user: newUser, details: signUpResponse }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error in SignUp or DB operation:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to register user',
        errorDetails: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

function generateSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}
