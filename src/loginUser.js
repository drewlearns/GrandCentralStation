// Importing AWS SDK v3 packages
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initializing the Cognito client
const REGION = "us-east-1"; // Region can be dynamic based on your configuration
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;

exports.handler = async (event) => {
    const { username, password } = JSON.parse(event.body);

    try {
        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CLIENT_ID,
            UserPoolId: USER_POOL_ID,
            AuthParameters: {
                'USERNAME': username,
                'PASSWORD': password,
            },
        };

        // Using v3 command pattern
        const command = new InitiateAuthCommand(params);
        const data = await cognitoClient.send(command);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Authentication successful',
                data: {
                    idToken: data.AuthenticationResult.IdToken,
                    accessToken: data.AuthenticationResult.AccessToken,
                    refreshToken: data.AuthenticationResult.RefreshToken
                }
            }),
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Authentication failed',
                error: error.message,
            }),
        };
    }
};
