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
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, transactionId } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;

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

      updatedBy = payload.username;
      if (!updatedBy) {
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

    const transactionExists = await prisma.transaction.findUnique({
      where: { transactionId: transactionId },
    });

    if (!transactionExists) {
      console.log(`Error: Transaction ${transactionId} does not exist`);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Transaction not found" }),
      };
    }

    const ledgerEntry = await prisma.ledger.findUnique({
      where: { ledgerId: transactionExists.ledgerId },
    });

    if (!ledgerEntry) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Ledger entry not found" }),
      };
    }

    await prisma.ledger.delete({
      where: { ledgerId: ledgerEntry.ledgerId },
    });

    await prisma.transaction.delete({
      where: { transactionId: transactionId },
    });

    // Invoke the secondary Lambda function to update running totals
    const updateTotalsCommand = new InvokeCommand({
      FunctionName: 'updateRunningTotal',
      Payload: JSON.stringify({ householdId: ledgerEntry.householdId, paymentSourceId: ledgerEntry.paymentSourceId }),
    });

    await lambdaClient.send(updateTotalsCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Transaction and ledger entry deleted successfully",
      }),
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

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
