const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand, ResourceNotFoundException } = require("@aws-sdk/client-lambda");
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
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, refreshToken, transactionId } = body;

    if (!authorizationToken || !refreshToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;
    let tokenValid = false;

    // First attempt to verify the token
    try {
      updatedBy = await verifyToken(authorizationToken);
      tokenValid = true;
    } catch (error) {
      console.error('Token verification failed, attempting refresh:', error.message);

      // Attempt to refresh the token and verify again
      try {
        const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
        updatedBy = result.userId;
        tokenValid = true;
      } catch (refreshError) {
        console.error('Token refresh and verification failed:', refreshError);
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
        };
      }
    }

    if (!tokenValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.' }),
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

    // Perform the operations in a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete the transaction first
      await prisma.transaction.delete({
        where: { transactionId: transactionId },
      });

      // Delete attachments linked to the ledger entry
      await prisma.attachments.deleteMany({
        where: { ledgerId: ledgerEntry.ledgerId },
      });

      // Delete the ledger entry
      await prisma.ledger.delete({
        where: { ledgerId: ledgerEntry.ledgerId },
      });
    });

    // Invoke the secondary Lambda function to update running totals
    try {
      const updateTotalsCommand = new InvokeCommand({
        FunctionName: 'calculateRunningTotal',
        Payload: JSON.stringify({ householdId: ledgerEntry.householdId, paymentSourceId: ledgerEntry.paymentSourceId }),
      });

      await lambdaClient.send(updateTotalsCommand);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        console.error('Error: Lambda function calculateRunningTotal not found:', error);
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            message: 'Lambda function calculateRunningTotal not found.',
            error: error.message,
          }),
        };
      } else {
        throw error;
      }
    }

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
