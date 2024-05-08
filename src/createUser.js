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
            userId: username, // Assuming username is the unique identifier for the user
            email,
            phoneNumber,
            firstName,
            lastName,
            createdAt: new Date().toISOString()
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
        TableName: process.env.DYNAMODB_TABLE_NAME, // Ensure you have the table name from environment variables
        Item: {
            PK: { S: `USER#${user.userId}` },
            SK: { S: `USER#${user.userId}` },
            email: { S: user.email },
            phoneNumber: { S: user.phoneNumber },
            firstName: { S: user.firstName },
            lastName: { S: user.lastName },
            createdAt: { S: user.createdAt },
            // Additional attributes if needed, using the correct names and structure for your single table design
            lastLogin: { S: "" }, // Empty string if not logged in yet
            subscribed: { BOOL: false }
        }
    };

    try {
        await dbClient.send(new PutItemCommand(params));
        console.log("Updated user in the database:", user.userId);
    } catch (dbError) {
        console.error("Error saving user to database:", dbError);
        throw new Error("Database operation failed");
    }
}

