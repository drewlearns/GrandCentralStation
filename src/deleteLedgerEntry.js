const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, ledgerId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
      headers: corsHeaders,
    };
  }

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken }),
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
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    const ledgerEntry = await prisma.ledger.findUnique({
      where: { ledgerId: ledgerId },
      include: {
        bill: true,
        income: true,
        transaction: true,
      },
    });

    if (!ledgerEntry) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Ledger entry not found' }),
        headers: corsHeaders,
      };
    }

    // Delete the connected bill, income, or transaction if they exist
    if (ledgerEntry.bill) {
      await prisma.bill.delete({
        where: { billId: ledgerEntry.bill.billId },
      });
    }

    if (ledgerEntry.income) {
      await prisma.income.delete({
        where: { incomeId: ledgerEntry.income.incomeId },
      });
    }

    if (ledgerEntry.transaction) {
      await prisma.transaction.delete({
        where: { transactionId: ledgerEntry.transaction.transactionId },
      });
    }

    // Delete the ledger entry
    await prisma.ledger.delete({
      where: { ledgerId: ledgerId },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ledger entry and connected records deleted successfully',
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to delete ledger entry',
        errorDetails: error.message,
      }),
      headers: corsHeaders,
    };
  } finally {
    await prisma.$disconnect();
  }
};
