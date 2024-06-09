const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!householdId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'No householdId provided.'
      })
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
    const ledgerEntries = await prisma.ledger.findMany({
      where: { householdId: householdId },
      include: {
        bill: {
          select: {
            billId: true,
            billName: true,
            amount: true,
            category: true
          }
        },
        income: {
          select: {
            incomeId: true,
            name: true,
            amount: true,
            frequency: true
          }
        },
        transactions: {
          select: {
            transactionId: true,
            amount: true,
            transactionDate: true,
            description: true
          }
        },
        paymentSource: {
          select: {
            sourceId: true,
            sourceName: true
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No ledger entries found" }),
      };
    }

    // Helper function to format numbers with two decimal places
    const formatNumber = (num) => Number(new Decimal(num).toFixed(2));

    // Flatten the transactions and merge the first transactionId into the ledger entry
    const flattenedLedgerEntries = ledgerEntries.map(entry => {
      const flattenedEntry = { ...entry };
      if (entry.transactions && entry.transactions.length > 0) {
        flattenedEntry.transactionId = entry.transactions[0].transactionId;
      }

      // Determine the type based on the presence of associated IDs
      if (flattenedEntry.bill && flattenedEntry.bill.billId) {
        flattenedEntry.type = 'bill';
      } else if (flattenedEntry.income && flattenedEntry.income.incomeId) {
        flattenedEntry.type = 'income';
      } else if (flattenedEntry.transactionId) {
        flattenedEntry.type = 'transaction';
      } else {
        flattenedEntry.type = 'unknown'; // Fallback type if no IDs are present
      }

      // Format amounts and runningTotal as numbers with two decimal places
      if (flattenedEntry.amount !== null) {
        flattenedEntry.amount = formatNumber(flattenedEntry.amount);
      }
      if (flattenedEntry.runningTotal !== null) {
        flattenedEntry.runningTotal = formatNumber(flattenedEntry.runningTotal);
      }
      if (flattenedEntry.bill) {
        flattenedEntry.bill.amount = formatNumber(flattenedEntry.bill.amount);
      }
      if (flattenedEntry.income) {
        flattenedEntry.income.amount = formatNumber(flattenedEntry.income.amount);
      }
      if (flattenedEntry.transactions && flattenedEntry.transactions.length > 0) {
        flattenedEntry.transactions = flattenedEntry.transactions.map(transaction => ({
          ...transaction,
          amount: formatNumber(transaction.amount),
        }));
      }
      delete flattenedEntry.transactions; // Remove the nested transactions array
      return flattenedEntry;
    });

    // Convert to JSON manually to ensure numbers maintain .00
    const jsonString = JSON.stringify({ ledgerEntries: flattenedLedgerEntries }, (key, value) => {
      if (typeof value === 'number') {
        return Number(value).toFixed(2);
      }
      return value;
    });

    // Replace the .00 quotes to maintain them as numbers
    const formattedJsonString = jsonString.replace(/"(-?\d+\.\d{2})"/g, '$1');

    return {
      statusCode: 200,
      body: formattedJsonString,
    };
  } catch (error) {
    console.error('Error retrieving ledger entries:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving ledger entries", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
