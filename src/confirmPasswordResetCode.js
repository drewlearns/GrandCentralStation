const { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };
function generateSecretHash(username, clientId, clientSecret) {
    return crypto.createHmac('SHA256', clientSecret)
                 .update(username + clientId)
                 .digest('base64');
}

exports.handler = async (event) => {
    const { username, code, newPassword } = JSON.parse(event.body);
    const clientId = process.env.USER_POOL_CLIENT_ID;
    const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
    const secretHash = generateSecretHash(username, clientId, clientSecret);

    const params = {
        ClientId: clientId,
        Username: username,
        ConfirmationCode: code,
        Password: newPassword,
        SecretHash: secretHash
    };

    try {
        await client.send(new ConfirmForgotPasswordCommand(params));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Password has been changed successfully.'
            }),
        };
    } catch (error) {
        console.error('Error in confirming new password:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Failed to change password',
                errorDetails: error.message
            }),

        };
    }
};
