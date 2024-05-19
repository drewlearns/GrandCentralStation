const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, billId, ipAddress, deviceDetails } = JSON.parse(event.body);

  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken })
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));
    
    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    username = payload.username;
    if (!username) {
      throw new Error('Token verification did not return a valid username.');
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken })
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));
    
    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    username = payload.username;
    if (!username) {
      throw new Error('Token verification did not return a valid username.');
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    if (!billId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing billId parameter" }),
      };
    }

    const bill = await prisma.bill.findUnique({
      where: { billId: billId },
    });

    if (!bill) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Bill not found" }),
      };
    }

    const secretArn = bill.username; // Assuming username field stores the ARN
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsManagerClient.send(command);

    // Log to audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Bill',
        actionType: 'Read',
        oldValue: '',
        newValue: JSON.stringify({ secret: JSON.parse(response.SecretString) }),
        changedBy: username,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ secret: JSON.parse(response.SecretString) }),
    };
  } catch (error) {
    console.error(`Error retrieving secret for bill ${billId}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving secret", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
