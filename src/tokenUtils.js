const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as needed

const verifyToken = async (authorizationToken) => {
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken }),
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

    if (verifyTokenResponse.FunctionError || payload.statusCode !== 200) {
      throw new Error(payload.message || 'Token verification failed.');
    }

    const userId = JSON.parse(payload.body).username;
    if (!userId) {
      throw new Error('Token verification did not return a valid user ID.');
    }

    return userId;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid token.');
  }
};

module.exports = {
  verifyToken,
};
