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
  const { authorizationToken, householdId, filters = {}, pagination = {}, numberOfItemsLoaded, lastResponse } = JSON.parse(event.body);

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
    const whereClause = { 
      householdId: householdId,
      isInitial: false // Exclude initial ledger entries
    };

    if (filters.clearedOnly) {
      whereClause.status = true;
    }

    if (filters.currentMonthOnly) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      whereClause.transactionDate = {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth
      };
    }

    if (filters.transactionName) {
      whereClause.description = { contains: filters.transactionName };
    }

    if (filters.minAmount || filters.maxAmount) {
      whereClause.amount = {};
      if (filters.minAmount) {
        whereClause.amount.gte = new Decimal(filters.minAmount);
      }
      if (filters.maxAmount) {
        whereClause.amount.lte = new Decimal(filters.maxAmount);
      }
    }

    if (filters.year) {
      const year = parseInt(filters.year, 10);
      if (!isNaN(year)) {
        const firstDayOfYear = new Date(year, 0, 1);
        const lastDayOfYear = new Date(year, 11, 31);
        whereClause.transactionDate = {
          ...whereClause.transactionDate,
          gte: firstDayOfYear,
          lte: lastDayOfYear,
        };
      }
    }

    if (filters.month) {
      const monthIndex = new Date(Date.parse(filters.month + " 1, 2022")).getMonth();
      if (!isNaN(monthIndex)) {
        const year = filters.year ? parseInt(filters.year, 10) : new Date().getFullYear();
        const firstDayOfMonth = new Date(year, monthIndex, 1);
        const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
        whereClause.transactionDate = {
          ...whereClause.transactionDate,
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        };
      }
    }

    const page = pagination.page || 1;
    const itemsPerPage = pagination.itemsPerPage || 10;
    const skip = (page - 1) * itemsPerPage;

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
      ],
      skip: skip,
      take: itemsPerPage,
    });

    const totalItems = await prisma.ledger.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No ledger entries found" }),
      };
    }

    const formatNumber = (num) => Number(new Decimal(num).toFixed(2));

    const setDefaultValues = (entry) => {
      if (entry.billId === null) entry.billId = '';
      if (entry.incomeId === null) entry.incomeId = '';
      if (entry.transactionId === null) entry.transactionId = '';
      if (entry.interestRate === null) entry.interestRate = 0.0;
      if (entry.cashBack === null) entry.cashBack = 0.0;
    };

    const flattenedLedgerEntries = ledgerEntries.map(entry => {
      const flattenedEntry = { ...entry };
      if (entry.transactions && entry.transactions.length > 0) {
        flattenedEntry.transactionId = entry.transactions[0].transactionId;
      }

      if (flattenedEntry.bill && flattenedEntry.bill.billId) {
        flattenedEntry.type = 'bill';
      } else if (flattenedEntry.income && flattenedEntry.income.incomeId) {
        flattenedEntry.type = 'income';
      } else {
        flattenedEntry.type = 'transaction';
      }

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

      delete flattenedEntry.transactions;

      // Add year and month fields
      const date = new Date(flattenedEntry.transactionDate);
      flattenedEntry.year = date.getFullYear();
      flattenedEntry.month = date.toLocaleString('default', { month: 'long' }).toLowerCase();

      return flattenedEntry;
    });

    const response = {
      nextPageNumber: page < totalPages ? page + 1 : null,
      numberOfItemsLoaded: flattenedLedgerEntries.length,
      hasMore: page < totalPages,
      lastResponse: flattenedLedgerEntries
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
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
