const { CognitoIdentityProviderClient, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

exports.handler = async (event) => {
    const { username, email, password, phoneNumber } = JSON.parse(event.body);
    const clientId = process.env.USER_POOL_CLIENT_ID;
    const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
    const secretHash = generateSecretHash(username, clientId, clientSecret);

    const signUpParams = {
        ClientId: clientId,
        SecretHash: secretHash,
        Username: username,
        Password: password,
        UserAttributes: [
            { Name: "email", Value: email },
            { Name: "phone_number", Value: phoneNumber } // Ensure phone number is in the format +1234567890
        ]
    };

    try {
        const signUpResponse = await cognitoClient.send(new SignUpCommand(signUpParams));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User registered successfully", details: signUpResponse }),
            headers: { "Content-Type": "application/json" }
        };
    } catch (error) {
        console.error("Error in SignUp:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to register user", errorDetails: error.message }),
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
