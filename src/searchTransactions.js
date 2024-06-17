const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const Decimal = require('decimal.js');
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file
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
  console.log('Event received:', JSON.stringify(event, null, 2));

  const { authorizationToken, query } = JSON.parse(event.body);

  if (!authorizationToken) {
    console.log('No authorization token provided.');
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let username;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    username = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      username = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Invalid token.',
          error: refreshError.message,
        }),
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

  try {
    console.log('Fetching user from database...');
    const user = await prisma.user.findFirst({
      where: { username: username },
    });

    if (!user) {
      console.error('User not found for username:', username);
      throw new Error('User not found.');
    }

    const userUuid = user.uuid;
    console.log('User found:', user);

    console.log('Fetching households for user...');
    const userHouseholds = await prisma.household.findMany({
      where: {
        members: {
          some: {
            memberUuid: userUuid,
          }
        }
      },
      select: {
        householdId: true,
        householdName: true
      }
    });

    const householdIds = userHouseholds.map(household => household.householdId);
    console.log('Household IDs:', householdIds);

    if (householdIds.length === 0) {
      console.log('No associated households found for user:', username);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No associated households found" }),
      };
    }

    const amountQuery = parseFloat(query);
    const isAmountQueryValid = !isNaN(amountQuery);
    console.log('Query:', query, 'Amount Query:', amountQuery, 'Is Amount Query Valid:', isAmountQueryValid);

    const ledgerSearchConditions = [
      { description: { contains: query, mode: 'insensitive' } },
      { tags: { contains: query, mode: 'insensitive' } },
      { category: { contains: query, mode: 'insensitive' } },
      { transactionType: { contains: query, mode: 'insensitive' } },
    ];

    if (isAmountQueryValid) {
      ledgerSearchConditions.unshift({ amount: { equals: amountQuery } });
    }

    console.log('Searching ledgers with conditions:', JSON.stringify(ledgerSearchConditions, null, 2));

    const ledgers = await prisma.ledger.findMany({
      where: {
        householdId: { in: householdIds },
        OR: ledgerSearchConditions,
      },
      include: {
        bill: true,
        income: true,
        transactions: true,
        paymentSource: true,
        household: true,
      },
    });

    if (ledgers.length === 0) {
      console.log('No transactions found matching the query for user:', username);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No transactions found matching the query" }),
      };
    }

    console.log('Ledgers found:', ledgers.length);

    const formatNumber = (num) => Number(new Decimal(num).toFixed(2));

    const setDefaultValues = (entry) => {
      entry.billId = entry.billId || '';
      entry.incomeId = entry.incomeId || '';
      entry.transactionId = entry.transactionId || '';
      entry.amount = entry.amount != null ? formatNumber(entry.amount) : 0.0;
      entry.description = entry.description || '';
      entry.tags = entry.tags || '';
      entry.category = entry.category || '';
      entry.transactionType = entry.transactionType || '';
      entry.transactionDate = entry.transactionDate || '';
      entry.householdName = entry.household ? entry.household.householdName : '';
      entry.paymentSourceName = entry.paymentSource ? entry.paymentSource.sourceName : '';
    };

    const flattenedLedgers = ledgers.map(entry => {
      const flattenedEntry = {
        ...entry,
        billId: entry.bill ? entry.bill.billId : '',
        incomeId: entry.income ? entry.income.incomeId : '',
        transactionId: entry.transactions && entry.transactions.length > 0 ? entry.transactions[0].transactionId : '',
        householdName: entry.household ? entry.household.householdName : '',
        paymentSourceName: entry.paymentSource ? entry.paymentSource.sourceName : '',
      };

      setDefaultValues(flattenedEntry);
      return flattenedEntry;
    });

    console.log('Flattened Ledgers:', JSON.stringify(flattenedLedgers, null, 2));

    const jsonString = JSON.stringify({ transactions: flattenedLedgers }, (key, value) => {
      if (typeof value === 'number') {
        return Number(value).toFixed(2);
      }
      return value;
    });

    const formattedJsonString = jsonString.replace(/"(-?\d+\.\d{2})"/g, '$1');

    console.log('Returning formatted JSON string:', formattedJsonString);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: formattedJsonString,
    };
  } catch (error) {
    console.error(`Error retrieving transactions: ${error.message}`);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error retrieving transactions",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
