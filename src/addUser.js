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
  const { username, email, password, mailOptIn, phoneNumber, firstName, lastName, ipAddress, deviceDetails } = JSON.parse(event.body);
  const mailOptInValue = mailOptIn === 'true';
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
  const secretHash = generateSecretHash(username, clientId, clientSecret);

  try {
    // Check if a user with the same uuid/username already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        uuid: username,
      },
    });

    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'User with this UUID already exists.' }),
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

    // Log the creation in the audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'User',
        actionType: 'Create',
        oldValue: '',
        newValue: JSON.stringify(newUser),
        changedBy: username,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    // Log the security event
    await prisma.securityLog.create({
      data: {
        logId: uuidv4(),
        userUuid: username,
        loginTime: new Date(),
        ipAddress,
        deviceDetails,
        locationDetails: '',
        actionType: 'User Signup',
        createdAt: new Date(),
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
