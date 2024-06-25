const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });

async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken',
    Payload: JSON.stringify({ authToken: token }),
  };

  const command = new InvokeCommand(params);
  const response = await lambda.send(command);

  const result = JSON.parse(new TextDecoder().decode(response.Payload));

  console.log('Token verification result:', JSON.stringify(result, null, 2)); // Log the result

  if (result.errorMessage) {
    throw new Error(result.errorMessage);
  }

  const payload = JSON.parse(result.body); // Parse the body to get the actual payload

  return payload;
}

async function getLedgerEntries(authToken, householdId, filters = {}) {
  // Verify the token
  const payload = await verifyToken(authToken);
  const userId = payload.user_id;
  if (!userId) {
    throw new Error('Invalid authorization token');
  }

  // Construct the basic where clause
  let where = {
    householdId,
    household: {
      members: {
        some: {
          memberUuid: userId, // Ensure entries are associated with the user
        }
      }
    },
    transactionDate: {
      lte: new Date() // Default: up to today's date at 23:59:59
    }
  };

  // Apply additional filters if provided
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (filters.showCurrentMonthOnly) {
    where.transactionDate = {
      gte: new Date(currentYear, currentMonth - 1, 1),
      lt: new Date(currentYear, currentMonth, 1)
    };
  }

  if (filters.showClearedOnly) {
    where.cleared = true;
  }

  if (filters.month && filters.year) {
    const startDate = new Date(filters.year, filters.month - 1, 1);
    const endDate = new Date(filters.year, filters.month, 1);
    where.transactionDate = {
      gte: startDate,
      lt: endDate
    };
  }

  if (filters.showCurrentMonthUpToToday === false) {
    delete where.transactionDate; // Remove the date filter
  }

  // Fetch the ledger entries with ordering by transactionDate in descending order
  const ledgerEntries = await prisma.ledger.findMany({
    where,
    orderBy: {
      transactionDate: 'desc',
    },
    include: {
      bill: true,
      income: true,
      transactions: true,
      paymentSource: {
        select: {
          sourceName: true,
        },
      },
    },
  });

  // Format the results
  const result = ledgerEntries.map(entry => ({
    ...entry,
    amount: new Decimal(entry.amount).toNumber(), // Convert to number
    runningTotal: new Decimal(entry.runningTotal).toNumber(), // Convert to number
    month: entry.transactionDate.getMonth() + 1,
    year: entry.transactionDate.getFullYear(),
    dayOfMonth: entry.transactionDate.getDate(),
    type: entry.billId ? 'bill' : entry.incomeId ? 'income' : 'transaction',
    bill: entry.bill || null,
    income: entry.income || null,
    transaction: entry.transactions.length > 0 ? entry.transactions[0] : null,
    paymentSourceName: entry.paymentSource?.sourceName || null,
  }));

  return result;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    // Handle preflight request
    return {
      statusCode: 200,
      headers,
    };
  }

  try {
    const { authToken, householdId, filters = {} } = JSON.parse(event.body);

    const ledgerEntries = await getLedgerEntries(authToken, householdId, filters);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: ledgerEntries,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: error.message,
      }),
    };
  }
};
