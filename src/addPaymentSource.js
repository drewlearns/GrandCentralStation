const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, householdId, sourceName, sourceType, details } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let createdBy;

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

    createdBy = payload.username;
    if (!createdBy) {
      throw new Error('Token verification did not return a valid username.');
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    const householdExists = await prisma.household.findUnique({
      where: { householdId: householdId },
    });

    if (!householdExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    const newPaymentSource = await prisma.paymentSource.create({
      data: {
        sourceId: uuidv4(),
        householdId: householdId,
        sourceName: sourceName,
        sourceType: sourceType,
        details: details,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Payment source added successfully",
        paymentSource: newPaymentSource,
      }),
    };
  } catch (error) {
    console.error(`Error creating payment source: ${error.message}`);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error creating payment source",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
