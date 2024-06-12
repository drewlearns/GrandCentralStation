const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, householdId, clearedOnly, currentMonthOnly } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!householdId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
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
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    // Prepare the where clause based on the provided arguments
    const whereClause = { householdId: householdId };

    if (clearedOnly) {
      whereClause.status = true;
    }

    if (currentMonthOnly) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      whereClause.transactionDate = {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth
      };
    }

    // Fetch all ledger entries based on the where clause
    const ledgerEntries = await prisma.ledger.findMany({
      where: whereClause,
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
      orderBy: [
        { transactionDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No ledger entries found" }),
      };
    }

    // Helper function to format numbers with two decimal places
    const formatNumber = (num) => Number(new Decimal(num).toFixed(2)).toFixed(2);

    // Helper function to set default values
    const setDefaultValues = (entry) => {
      if (entry.billId === null) entry.billId = '';
      if (entry.incomeId === null) entry.incomeId = '';
      if (entry.transactionId === null) entry.transactionId = '';
      if (entry.interestRate === null) entry.interestRate = 0.0;
      if (entry.cashBack === null) entry.cashBack = 0.0;
    };

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
      } else {
        flattenedEntry.type = 'transaction';
      }

      // Set default values
      setDefaultValues(flattenedEntry);
      if (flattenedEntry.bill) setDefaultValues(flattenedEntry.bill);
      if (flattenedEntry.income) setDefaultValues(flattenedEntry.income);
      if (flattenedEntry.transactions && flattenedEntry.transactions.length > 0) {
        flattenedEntry.transactions = flattenedEntry.transactions.map(transaction => {
          setDefaultValues(transaction);
          return {
            ...transaction,
            amount: formatNumber(transaction.amount),
          };
        });
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

      delete flattenedEntry.transactions; // Remove the nested transactions array
      return flattenedEntry;
    });

    // Convert to JSON manually to ensure numbers maintain .00
    const jsonString = JSON.stringify({ ledgerEntries: flattenedLedgerEntries }, (key, value) => {
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return value;
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: jsonString,
    };
  } catch (error) {
    console.error('Error retrieving ledger entries:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error retrieving ledger entries", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
