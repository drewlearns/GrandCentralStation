// Importing AWS SDK v3 packages
import { CognitoIdentityProviderClient, ForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initializing the Cognito client
const REGION = "us-east-1"; // Region can be dynamic based on your configuration
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;

exports.handler = async (event) => {
    const { username } = JSON.parse(event.body);

    try {
        const params = {
            ClientId: CLIENT_ID,
            Username: username,
        };

        // Using v3 command pattern
        const command = new ForgotPasswordCommand(params);
        await cognitoClient.send(command);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Password reset initiated, verification code sent.',
            }),
        };
    } catch (error) {
        console.error('Forgot password error:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to initiate password reset',
                error: error.message,
            }),
        };
    }
};
