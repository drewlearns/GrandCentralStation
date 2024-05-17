const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

function generateSecretHash(username, clientId, clientSecret) {
    return crypto.createHmac('SHA256', clientSecret)
                 .update(username + clientId)
                 .digest('base64');
}

exports.handler = async (event) => {
    const { username, code, newPassword, ipAddress, deviceDetails } = JSON.parse(event.body);
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

        // Log an entry in the AuditTrail
        await prisma.auditTrail.create({
            data: {
                auditId: crypto.randomUUID(),
                tableAffected: 'User',
                actionType: 'PasswordReset',
                oldValue: '',
                newValue: JSON.stringify({ username }),
                changedBy: username,
                changeDate: new Date(),
                timestamp: new Date(),
                device: deviceDetails,
                ipAddress,
                deviceType: '',
                ssoEnabled: 'false',
            },
        });

        // Log an entry in the SecurityLog
        await prisma.securityLog.create({
            data: {
                logId: crypto.randomUUID(),
                userUuid: username,
                loginTime: new Date(),
                ipAddress,
                deviceDetails,
                locationDetails: '',
                actionType: 'PasswordReset',
                createdAt: new Date(),
            },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Password has been changed successfully.'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        console.error('Error in confirming new password:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to change password',
                errorDetails: error.message
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
