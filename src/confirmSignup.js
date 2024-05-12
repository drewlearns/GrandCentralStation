const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require('crypto');

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

exports.handler = async (event) => {
    const { username, confirmationCode } = JSON.parse(event.body);
    const clientId = process.env.USER_POOL_CLIENT_ID;
    const clientSecret = process.env.USER_POOL_CLIENT_SECRET; // Ensure this is set in your Lambda environment variables
    const secretHash = generateSecretHash(username, clientId, clientSecret);

    const confirmSignUpParams = {
        ClientId: clientId,
        SecretHash: secretHash,
        Username: username,
        ConfirmationCode: confirmationCode,
    };

    try {
        const confirmSignUpResponse = await cognitoClient.send(new ConfirmSignUpCommand(confirmSignUpParams));

        // Update the confirmed_email field in the database for this user
        const updatedUser = await prisma.user.update({
            where: { uuid: username }, // Adjust if you use a different identifier
            data: { confirmedEmail: true },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Email verified and user updated successfully", details: confirmSignUpResponse, user: updatedUser }),
            headers: { "Content-Type": "application/json" }
        };
    } catch (error) {
        console.error("Error in ConfirmSignUp or DB operation:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to verify email and update user", errorDetails: error.message }),
            headers: { "Content-Type": "application/json" }
        };
    }
};

function generateSecretHash(username, clientId, clientSecret) {
  return crypto.createHmac('SHA256', clientSecret)
               .update(username + clientId)
               .digest('base64');
}
