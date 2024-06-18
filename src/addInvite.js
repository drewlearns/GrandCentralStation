// Import necessary modules and initialize clients
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

// Lambda handler function
exports.handler = async (event) => {
  try {
    // Parse request body
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { authorizationToken, refreshToken, email, householdId } = body;

    console.log(`Received request to add email ${email} to household ${householdId}`);

    // Check for authorization and refresh tokens
    if (!authorizationToken || !refreshToken) {
      console.log('No authorization token or refresh token provided');
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;
    let tokenValid = false;

    // Verify token
    try {
      updatedBy = await verifyToken(authorizationToken);
      tokenValid = true;
    } catch (error) {
      console.error('Token verification failed, attempting refresh:', error.message);

      // Refresh and verify token
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      updatedBy = result.userId;
      authorizationToken = result.newToken; // Update authorizationToken with new token
      tokenValid = true;
    }

    if (!tokenValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.' }),
      };
    }

    console.log(`Token verified. Updated by ${updatedBy}`);

    // Check if household exists
    const householdExists = await prisma.household.findUnique({
      where: { householdId: householdId },
    });

    if (!householdExists) {
      console.log(`Household ${householdId} not found`);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    console.log(`Household ${householdId} exists`);

    // Use the email as the UUID
    const userUUID = email;
    console.log(`Using email as UUID: ${userUUID}`);

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { uuid: userUUID },
    });

    if (userExists) {
      console.log(`User with email ${email} exists`);

      // Check if user is already a member of the household
      const isMember = await prisma.householdMembers.findFirst({
        where: {
          householdId: householdId,
          memberUuid: userUUID,
        }
      });

      if (isMember) {
        console.log(`User ${userUUID} is already a member of household ${householdId}`);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ message: "User is already a member of the household." }),
        };
      }

      console.log(`User ${userUUID} is not a member of household ${householdId}. Adding them now.`);

      // Add user to household members
      await prisma.householdMembers.create({
        data: {
          householdId: householdId,
          memberUuid: userUUID,
          role: 'member', // Adjust role as needed
          joinedDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
      });

      console.log(`User ${userUUID} added to household ${householdId}`);

      // Send email to existing user
      const emailParams = {
        Destination: {
          ToAddresses: [email]
        },
        Message: {
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: `You have been added to the household: ${householdExists.householdName}.`
            }
          },
          Subject: {
            Charset: 'UTF-8',
            Data: 'Household Membership'
          }
        },
        Source: 'noreply@app.thepurplepiggybank.com'
      };

      try {
        await sesClient.send(new SendEmailCommand(emailParams));
        console.log(`Membership email sent to ${email}`);
      } catch (error) {
        console.error('Error sending email:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            message: "Error sending email",
            error: error.message,
          }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "User added to household and email sent successfully",
        }),
      };
    } else {
      console.log(`User with email ${email} does not exist. Creating invitation.`);

      // Create the invitation
      const newInvitation = await prisma.invitations.create({
        data: {
          invitationId: uuidv4(),
          householdId: householdId,
          invitedUserEmail: email,
          invitedUserUuid: null, // Set to null if user does not exist
          invitationStatus: 'Pending',
          sentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`Invitation created with ID ${newInvitation.invitationId}`);

      // Send the invitation email via SES
      const emailParams = {
        Destination: {
          ToAddresses: [email]
        },
        Message: {
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: `You have been invited to join the household. Please click the link to accept the invitation: https://app.thepurplepiggybank.com/AcceptInvite. Invitation code: ${newInvitation.invitationId}`
            }
          },
          Subject: {
            Charset: 'UTF-8',
            Data: 'Household Invitation'
          }
        },
        Source: 'noreply@app.thepurplepiggybank.com'
      };

      try {
        await sesClient.send(new SendEmailCommand(emailParams));
        console.log(`Invitation email sent to ${email}`);
      } catch (error) {
        console.error('Error sending email:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            message: "Error sending email",
            error: error.message,
          }),
        };
      }

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Invitation added and email sent successfully",
          invitation: newInvitation,
        }),
      };
    }
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
