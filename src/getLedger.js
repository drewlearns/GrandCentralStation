const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary

async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken', // Replace with your actual Lambda function name
    Payload: new TextEncoder().encode(JSON.stringify({ token })),
  };
  
  const command = new InvokeCommand(params);
  const response = await lambda.send(command);
  
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  if (payload.errorMessage) {
    throw new Error(payload.errorMessage);
  }

  return payload.isValid;
}

async function getLedgerEntries(authToken, householdId, pageNumber = 1, filters = {}) {
  // Verify the token
  const isValid = await verifyToken(authToken);
  if (!isValid) {
    throw new Error('Invalid authorization token');
  }

  // Determine the filter criteria
  const { month, year, showCurrentMonthOnly = false, showClearedOnly = false, showCurrentMonthUpToToday = true } = filters;

  let where = {
    householdId,
  };

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  if (showCurrentMonthOnly) {
    where.transactionDate = {
      gte: new Date(currentYear, currentMonth - 1, 1),
      lt: new Date(currentYear, currentMonth, 1),
    };
  } else if (month && year) {
    where.transactionDate = {
      gte: new Date(year, month - 1, 1),
      lt: new Date(year, month, 1),
    };
  } else if (showCurrentMonthUpToToday) {
    where.transactionDate = {
      gte: new Date(currentYear, currentMonth - 1, 1),
      lt: new Date(currentYear, currentMonth - 1, currentDate.getDate() + 1),
    };
  }

  if (showClearedOnly) {
    where.status = true;
  }

  // Pagination logic
  const pageSize = 20;
  const skip = (pageNumber - 1) * pageSize;

  // Fetch the total count for pagination
  const totalCount = await prisma.ledger.count({ where });

  // Fetch the ledger entries with ordering by transactionDate in descending order
  const ledgerEntries = await prisma.ledger.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: {
      transactionDate: 'desc',
    },
    include: {
      bill: true,
      income: true,
      transactions: true,
    },
  });

  // Format the results
  const result = ledgerEntries.map(entry => ({
    ...entry,
    amount: new Decimal(entry.amount).toFixed(2),
    runningTotal: new Decimal(entry.runningTotal).toFixed(2),
    month: entry.transactionDate.getMonth() + 1,
    year: entry.transactionDate.getFullYear(),
    dayOfMonth: entry.transactionDate.getDate(),
    type: entry.billId ? 'bill' : entry.incomeId ? 'income' : 'transaction',
    bill: entry.bill || null,
    income: entry.income || null,
    transaction: entry.transactions.length > 0 ? entry.transactions[0] : null,
  }));

  return {
    entries: result,
    pagination: {
      totalItems: totalCount,
      currentPage: pageNumber,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
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
    const { authToken, householdId, pageNumber, filters } = JSON.parse(event.body);

    const ledgerEntries = await getLedgerEntries(authToken, householdId, pageNumber, filters);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: ledgerEntries.entries,
        pagination: ledgerEntries.pagination,
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
