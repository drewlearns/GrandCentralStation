const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const Decimal = require('decimal.js');
const { TextEncoder, TextDecoder } = require('util');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
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

  return payload;
}

exports.handler = async (event) => {
  const { authorizationToken, householdId } = JSON.parse(event.body);

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
  let tokenValid = false;

  // Attempt to verify the token
  try {
    const tokenPayload = await verifyToken(authorizationToken);
    username = tokenPayload.uid;
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.' }),
    };
  }

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Normalize today's date to midnight UTC
    console.log(`Today's date: ${today}`);

    // Fetch all incomes for the household
    console.log(`Fetching incomes for householdId: ${householdId}`);
    const incomes = await prisma.incomes.findMany({
      where: { householdId: householdId },
    });

    console.log(`Incomes found: ${JSON.stringify(incomes)}`);
    
    if (incomes.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No incomes found for the household." }),
      };
    }

    // Find the next payday
    let nextPayday = null;
    for (const income of incomes) {
      const frequency = income.frequency.toLowerCase();
      let payday = new Date(income.firstPayDay);

      while (payday <= today) {
        if (frequency === 'weekly') {
          payday.setDate(payday.getDate() + 7);
        } else if (frequency === 'biweekly') {
          payday.setDate(payday.getDate() + 14);
        } else if (frequency === 'monthly') {
          payday.setMonth(payday.getMonth() + 1);
        } else if (frequency === 'bimonthly') {
          payday.setMonth(payday.getMonth() + 2);
        } else if (frequency === 'quarterly') {
          payday.setMonth(payday.getMonth() + 3);
        } else if (frequency === 'semiannually') {
          payday.setMonth(payday.getMonth() + 6);
        } else if (frequency === 'annually') {
          payday.setFullYear(payday.getFullYear() + 1);
        } else {
          throw new Error(`Unsupported income frequency: ${income.frequency}`);
        }
      }

      if (!nextPayday || payday < nextPayday) {
        nextPayday = payday;
      }
    }

    if (!nextPayday || nextPayday <= today) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Could not determine the next payday in the future." }),
      };
    }

    // Fetch ledger entries up to the end of the day before the next payday
    const dayBeforeNextPayday = new Date(nextPayday);
    dayBeforeNextPayday.setDate(nextPayday.getDate() - 1);
    dayBeforeNextPayday.setUTCHours(23, 59, 59, 999); // Set to the end of the previous day
    
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        transactionDate: {
          gte: today,
          lte: dayBeforeNextPayday,
        },
      },
      orderBy: [
        { transactionDate: 'asc' },
        { createdAt: 'asc' } // Ensure the entries are ordered by both date and creation time
      ],
    });

    if (ledgerEntries.length === 0) {
      // Fetch the most recent ledger entry before today if no ledger entries are found in the period
      const recentLedgerEntry = await prisma.ledger.findFirst({
        where: {
          householdId: householdId,
          transactionDate: {
            lte: today,
          },
        },
        orderBy: { transactionDate: 'desc' },
      });

      const safeToSpend = recentLedgerEntry ? parseFloat(recentLedgerEntry.runningTotal) : 0.00;
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          safeToSpend: safeToSpend,
          nextPayday: nextPayday.toISOString(),
        }),
      };
    }

    // Find the lowest running total between today and the end of the day before the next payday
    const lowestRunningTotal = ledgerEntries.reduce((lowest, entry) => {
      const runningTotal = new Decimal(entry.runningTotal);
      return runningTotal.lessThan(lowest) ? runningTotal : lowest;
    }, new Decimal(ledgerEntries[0].runningTotal));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        safeToSpend: lowestRunningTotal.toNumber(),
        nextPayday: nextPayday.toISOString(),
      }),
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
