const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, ledgerId, updatedData } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      }),
      headers: { 'Content-Type': 'application/json' },
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
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Update the ledger entry
    const updatedLedger = await prisma.ledger.update({
      where: { ledgerId: ledgerId },
      data: {
        ...updatedData.ledger,
        updatedAt: new Date(),
      },
    });

    // Update the connected bill, income, or transaction if they exist
    if (updatedData.bill && ledgerEntry.bill) {
      await prisma.bill.update({
        where: { billId: ledgerEntry.bill.billId },
        data: {
          ...updatedData.bill,
          updatedAt: new Date(),
        },
      });
    }

    if (updatedData.income && ledgerEntry.income) {
      await prisma.income.update({
        where: { incomeId: ledgerEntry.income.incomeId },
        data: {
          ...updatedData.income,
          updatedAt: new Date(),
        },
      });
    }

    if (updatedData.transaction && ledgerEntry.transaction) {
      await prisma.transaction.update({
        where: { transactionId: ledgerEntry.transaction.transactionId },
        data: {
          ...updatedData.transaction,
          updatedAt: new Date(),
        },
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ledger entry updated successfully',
        ledger: updatedLedger,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error updating ledger entry:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to update ledger entry',
        errorDetails: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } finally {
    await prisma.$disconnect();
  }
};
