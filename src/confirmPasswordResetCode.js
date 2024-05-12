const { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

exports.handler = async (event) => {
    const { username, code, newPassword } = JSON.parse(event.body);
    const secretHash = generateSecretHash(username, process.env.USER_POOL_CLIENT_ID, process.env.USER_POOL_CLIENT_SECRET);

    const params = {
        ClientId: process.env.USER_POOL_CLIENT_ID,
        Username: username,
        ConfirmationCode: code,
        Password: newPassword,
        SecretHash: secretHash
    };

    try {
        await client.send(new ConfirmForgotPasswordCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Password has been changed successfully."
            }),
            headers: {
                "Content-Type": "application/json"
            }
        };
    } catch (error) {
        console.error("Error in confirming new password:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Failed to change password",
                errorDetails: error.message
            }),
            headers: {
                "Content-Type": "application/json"
            }
        };
    }
};

function generateSecretHash(username, clientId, clientSecret) {
    const crypto = require('crypto');
    return crypto.createHmac('SHA256', clientSecret)
                 .update(username + clientId)
                 .digest('base64');
}