const { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require('crypto');

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

// Function to generate the secret hash using the client secret
function generateSecretHash(username, clientId, clientSecret) {
    return crypto.createHmac('SHA256', clientSecret)
                 .update(username + clientId)
                 .digest('base64');
}

exports.handler = async (event) => {
    const { username, password, mfaCode, session } = JSON.parse(event.body);
    const clientId = process.env.USER_POOL_CLIENT_ID;
    const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

    if (!session) {
        // First attempt to authenticate
        return initiateAuth(username, password, clientId, clientSecret);
    } else {
        // Respond to MFA challenge
        return respondToMFASetupChallenge(username, mfaCode, session, clientId, clientSecret);
    }
};

function initiateAuth(username, password, clientId, clientSecret) {
    const authParameters = {
        'USERNAME': username,
        'PASSWORD': password,
    };

    // Add SECRET_HASH to the parameters if client secret is used
    if (clientSecret) {
        authParameters.SECRET_HASH = generateSecretHash(username, clientId, clientSecret);
    }

    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: authParameters,
    };

    return client.send(new InitiateAuthCommand(params))
        .then(response => handleAuthResponse(response))
        .catch(error => {
            console.error("Authentication error:", error);
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Authentication failed", errorDetails: error.message }),
                headers: { "Content-Type": "application/json" }
            };
        });
}

function respondToMFASetupChallenge(username, session, clientId, clientSecret) {
    const challengeResponses = {
        'USERNAME': username,
        'SECRET_HASH': generateSecretHash(username, clientId, clientSecret)
    };

    const params = {
        ChallengeName: 'MFA_SETUP',
        ClientId: clientId,
        ChallengeResponses: challengeResponses,
        Session: session,
    };

    return client.send(new RespondToAuthChallengeCommand(params))
        .then(response => handleAuthResponse(response))
        .catch(error => {
            console.error("MFA setup error:", error);
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Failed to setup MFA", errorDetails: error.message }),
                headers: { "Content-Type": "application/json" }
            };
        });
}


function handleAuthResponse(response) {
    if (response.AuthenticationResult) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Authentication successful",
                tokens: response.AuthenticationResult,
            }),
            headers: { "Content-Type": "application/json" }
        };
    } else if (response.ChallengeName) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "MFA challenge required",
                challengeName: response.ChallengeName,
                session: response.Session,
            }),
            headers: { "Content-Type": "application/json" }
        };
    } else {
        return {
            statusCode: 204,
            body: JSON.stringify({ message: "Unexpected response" }),
            headers: { "Content-Type": "application/json" }
        };
    }
}
