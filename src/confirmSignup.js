const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

exports.handler = async (event) => {
    const { username, confirmationCode } = JSON.parse(event.body);
    const clientId = process.env.USER_POOL_CLIENT_ID
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
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Email verified successfully", details: confirmSignUpResponse }),
            headers: { "Content-Type": "application/json" }
        };
    } catch (error) {
        console.error("Error in ConfirmSignUp:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to verify email", errorDetails: error.message }),
            headers: { "Content-Type": "application/json" }
        };
    }
};

function generateSecretHash(username, clientId, clientSecret) {
  const crypto = require('crypto');
  return crypto.createHmac('SHA256', clientSecret)
               .update(username + clientId)
               .digest('base64');
}