const { PrismaClient } = require('@prisma/client');
const { CognitoIdentityProviderClient, SignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

const generateSecretHash = (username, clientId, clientSecret) => {
  return crypto.createHmac('SHA256', clientSecret).update(username + clientId).digest('base64');
};

exports.handler = async (event) => {
  let body;

  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON input' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const { username, email, password, mailOptIn, phoneNumber, firstName, lastName } = body;
  const mailOptInValue = mailOptIn === 'true';
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
  const secretHash = generateSecretHash(username, clientId, clientSecret);

  try {
    // Check if a user with the same uuid/username already exists
    const existingUserByUUID = await prisma.user.findUnique({
      where: {
        uuid: username,
      },
    });

    if (existingUserByUUID) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'User with this UUID already exists.' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Check if a user with the same email already exists
    const existingUserByEmail = await prisma.user.findFirst({
      where: { email: email },
    });

    if (existingUserByEmail) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'User with this email already exists.' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Sign up user in Cognito
    const signUpParams = {
      ClientId: clientId,
      SecretHash: secretHash,
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'phone_number', Value: phoneNumber },
      ],
    };

    const signUpResponse = await cognitoClient.send(new SignUpCommand(signUpParams));

    const signupDate = new Date();
    const subscriptionEndDate = new Date(signupDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days later

    // Create new user in the database
    const newUser = await prisma.user.create({
      data: {
        uuid: username,
        username,
        email,
        phoneNumber,
        firstName,
        lastName,
        createdAt: signupDate,
        signupDate: signupDate,
        updatedAt: signupDate,
        confirmedEmail: false,
        mailOptIn: mailOptInValue,
        subscriptionEndDate: subscriptionEndDate,
        subscriptionStatus: 'trial',
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User registered successfully',
        user: newUser,
        details: signUpResponse,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error in SignUp or DB operation:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to register user', errorDetails: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
};
