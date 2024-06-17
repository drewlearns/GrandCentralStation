const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { verifyToken } = require('./tokenUtils'); // Assuming verifyToken is in tokenUtils.js

const lambdaClient = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as needed

const refreshAndVerifyToken = async (authorizationToken, refreshToken) => {
    try {
        // Try to refresh the token
        const refreshTokenCommand = new InvokeCommand({
            FunctionName: 'refreshToken',
            Payload: JSON.stringify({ authorizationToken, refreshToken }),
        });

        const refreshTokenResponse = await lambdaClient.send(refreshTokenCommand);
        const refreshTokenPayload = JSON.parse(new TextDecoder('utf-8').decode(refreshTokenResponse.Payload));

        if (refreshTokenResponse.FunctionError || refreshTokenPayload.statusCode !== 200) {
            throw new Error(refreshTokenPayload.message || 'Token refresh failed.');
        }

        const newToken = JSON.parse(refreshTokenPayload.body).newToken;

        // Verify the new token
        const userId = await verifyToken(newToken);

        return { userId, newToken };
    } catch (error) {
        console.error('Token refresh and verification failed:', error);
        throw new Error('Invalid token.');
    }
};

module.exports = {
    refreshAndVerifyToken,
};
