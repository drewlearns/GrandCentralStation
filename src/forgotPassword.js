const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { CognitoIdentityProviderClient, ForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

function generateSecretHash(username, clientId, clientSecret) {
    return crypto.createHmac('SHA256', clientSecret)
                 .update(username + clientId)
                 .digest('base64');
}

exports.handler = async (event) => {
    const { username } = JSON.parse(event.body);
    const clientId = process.env.USER_POOL_CLIENT_ID;
    const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

    try {
        const secretHash = generateSecretHash(username, clientId, clientSecret);

        const params = {
            ClientId: clientId,
            Username: username,
            SecretHash: secretHash,
        };

        await client.send(new ForgotPasswordCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Password reset code sent successfully. Check your registered email or SMS.'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        console.error('Error in forgot password process:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to send password reset code',
                errorDetails: error.message
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
