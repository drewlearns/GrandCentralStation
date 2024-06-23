const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambdaClient.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload.isValid;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, transactionId } = body;

    // Validate required fields
    if (!transactionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing required field: transactionId is required.' })
      };
    }

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Access denied. No token provided.' })
      };
    }

    // Verify the token
    const isValid = await verifyToken(authorizationToken);
    if (!isValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid authorization token' }),
      };
    }

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({ where: { transactionId } });
    if (!transaction) return { statusCode: 404, body: JSON.stringify({ message: "Transaction not found" }) };

    // Find the associated ledger entry
    const ledgerEntry = await prisma.ledger.findUnique({ where: { ledgerId: transaction.ledgerId } });
    if (!ledgerEntry) return { statusCode: 404, body: JSON.stringify({ message: "Ledger entry not found" }) };

    // Delete the transaction
    await prisma.transaction.delete({ where: { transactionId } });

    // Delete the ledger entry
    await prisma.ledger.delete({ where: { ledgerId: ledgerEntry.ledgerId } });

    // Update running totals
    const updateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: ledgerEntry.householdId, paymentSourceId: ledgerEntry.paymentSourceId }),
    });

    await lambdaClient.send(updateTotalsCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Transaction deleted successfully" })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error processing request", error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
