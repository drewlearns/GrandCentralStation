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

    // Create household, default payment source, and preferences in a transaction
    const householdTransaction = await prisma.$transaction(async (prisma) => {
      const household = await prisma.household.create({
        data: {
          householdId: uuidv4(),
          householdName: `${lastName} Household`,
          creationDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          setupComplete: false,
          activeSubscription: false,
          members: {
            create: [
              {
                id: uuidv4(),
                memberUuid: username,
                role: 'Owner',
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        },
      });

      // Create a default payment source
      const defaultPaymentSource = await prisma.paymentSource.create({
        data: {
          sourceId: uuidv4(),
          householdId: household.householdId,
          sourceName: 'Default Payment Source',
          sourceType: 'Default Type', // Add a suitable default type
          description: 'Default payment source for household', // Add a suitable default description
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create a preference entry for the default payment source
      await prisma.preferences.create({
        data: {
          preferenceId: uuidv4(),
          householdId: household.householdId,
          preferenceType: 'Payment Source',
          preferenceValue: defaultPaymentSource.sourceId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const existingInitialLedger = await prisma.ledger.findFirst({
        where: {
          householdId: household.householdId,
          transactionType: 'Credit',
        },
      });

      if (!existingInitialLedger) {
        await prisma.ledger.create({
          data: {
            ledgerId: uuidv4(),
            householdId: household.householdId,
            paymentSourceId: defaultPaymentSource.sourceId,
            amount: 0.0,
            runningTotal: 0.0,
            transactionType: 'Credit',
            transactionDate: new Date(),
            category: 'Initial Setup',
            description: 'Initially created ledger - This can be deleted',
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: username,
            status: true,
          },
        });
      }

      return household;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User registered successfully',
        user: newUser,
        household: householdTransaction,
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
