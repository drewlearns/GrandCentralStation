const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, refreshToken, householdId, sourceName, sourceType, details } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let createdBy;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    createdBy = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
    createdBy = result.userId;
    authorizationToken = result.newToken; // Update authorizationToken with new token
    tokenValid = true;
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.' }),
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
      headers: corsHeaders,
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
