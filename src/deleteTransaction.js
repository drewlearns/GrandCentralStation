const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { TextDecoder } = require('util');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken', // Replace with your actual Lambda function name
    Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
  };

  const command = new InvokeCommand(params);
  const response = await lambdaClient.send(command);

  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  console.log("verifyToken response payload:", payload);

  if (payload.errorMessage) {
    throw new Error(payload.errorMessage);
  }

  const nestedPayload = JSON.parse(payload.body);

  console.log("verifyToken nested payload:", nestedPayload);

  return nestedPayload;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }

  const body = JSON.parse(event.body);
  const { authToken, transactionId } = body;

  if (!authToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Access denied. No token provided.' })
    };
  }

  if (!transactionId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Missing required field: transactionId is required.' })
    };
  }

  let userId;

  try {
    // Verify the token
    const nestedPayload = await verifyToken(authToken);
    userId = nestedPayload.user_id;
    console.log('Verified user_id:', userId);

    if (!userId) {
      throw new Error('User ID is undefined after token verification');
    }

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Transaction not found' }),
      };
    }

    // Find the associated ledger entry
    const ledgerEntry = await prisma.ledger.findUnique({
      where: { ledgerId: transaction.ledgerId },
    });

    if (!ledgerEntry) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Ledger entry not found' }),
      };
    }

    // Check if the user is a member of the household
    const householdMember = await prisma.householdMembers.findFirst({
      where: {
        householdId: ledgerEntry.householdId,
        memberUuid: userId,
      },
    });

    if (!householdMember) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Delete the associated attachments
    await prisma.attachments.deleteMany({
      where: { ledgerId: ledgerEntry.ledgerId },
    });

    // Delete the transaction
    await prisma.transaction.delete({
      where: { transactionId },
    });

    // Delete the ledger entry
    await prisma.ledger.delete({
      where: { ledgerId: ledgerEntry.ledgerId },
    });

    // Update running totals
    const updateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({
        householdId: ledgerEntry.householdId,
        paymentSourceId: ledgerEntry.paymentSourceId,
      }),
    });

    await lambdaClient.send(updateTotalsCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Transaction deleted successfully' }),
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Error processing request', error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
