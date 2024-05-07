const { CognitoIdentityProviderClient, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const crypto = require('crypto');

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });
const dbClient = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
    const { username, email, password, phoneNumber, firstName, lastName } = JSON.parse(event.body);
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
            { Name: "phone_number", Value: phoneNumber }
        ]
    };

    try {
        const signUpResponse = await cognitoClient.send(new SignUpCommand(signUpParams));
        
        // Proceed to insert the user into the database
        await createUserInDatabase({
            cognitoId: signUpResponse.UserSub, // Cognito unique user identifier
            username,
            email,
            phoneNumber,
            firstName,
            lastName
        });

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
    return crypto.createHmac('SHA256', clientSecret)
                 .update(username + clientId)
                 .digest('base64');
}

async function createUserInDatabase(user) {
    const params = {
        TableName: "user_table",
        Item: {
            "user_id": { S: user.cognitoId },
            "username": { S: user.username },
            "email": { S: user.email },
            "phoneNumber": { S: user.phoneNumber },
            "firstName": {S: user.firstName},
            "lastName":{S:user.lastName}
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
    } catch (dbError) {
        console.error("Error saving user to database:", dbError);
        throw new Error("Database operation failed");
    }
}
