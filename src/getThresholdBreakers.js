const { PrismaClient } = require("@prisma/client");
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
  const {
    authorizationToken,
    householdId,
    threshold,
    paymentSourceId,
  } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Access denied. No token provided." }),
    };
  }

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: "verifyToken",
      Payload: JSON.stringify({ authorizationToken }),
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(
      new TextDecoder("utf-8").decode(verifyTokenResponse.Payload)
    );

    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || "Token verification failed.");
    }

    username = payload.username;
    if (!username) {
      throw new Error("Token verification did not return a valid username.");
    }
  } catch (error) {
    console.error("Token verification failed:", error);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invalid token.", error: error.message }),
    };
  }

  try {
    if (!householdId || !threshold || !paymentSourceId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Missing householdId, threshold, or paymentSourceId parameter",
        }),
      };
    }

    // Fetch ledger entries with running total for the specified paymentSourceId
    const ledgerEntries = await prisma.ledger.findMany({
      where: { householdId: householdId, paymentSourceId: paymentSourceId },
      orderBy: { transactionDate: "asc" },
      select: {
        transactionDate: true,
        amount: true,
        runningTotal: true,
        description: true,  // Fetching description directly from the Ledger table
      },
    });

    const entriesBelowThreshold = ledgerEntries.filter(
      (entry) => entry.runningTotal < threshold
    ).map(entry => ({
      transactionDate: entry.transactionDate,
      amount: entry.amount,
      runningTotal: entry.runningTotal,
      description: entry.description,
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ entries: entriesBelowThreshold }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
