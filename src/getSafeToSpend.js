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
    const today = new Date();
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
        body: JSON.stringify({ message: "No incomes found for the household." }),
      };
    }

    // Find the next payday
    let nextPayday = null;
    let lastPaydayBeforeToday = null;

    for (const income of incomes) {
      const frequency = income.frequency.toLowerCase();
      let payday = new Date(income.firstPayDay);
      console.log(`Processing income: ${JSON.stringify(income)}, current payday: ${payday}`);

      while (payday <= today) {
        lastPaydayBeforeToday = new Date(payday);
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
        } else if (frequency === 'annually') {
          payday.setFullYear(payday.getFullYear() + 1);
        } else {
          throw new Error(`Unsupported income frequency: ${income.frequency}`);
        }
        console.log(`Updated payday: ${payday}`);
      }

      if (!nextPayday || payday < nextPayday) {
        nextPayday = payday;
      }
      console.log(`Current nextPayday: ${nextPayday}, lastPaydayBeforeToday: ${lastPaydayBeforeToday}`);
    }

    if (!nextPayday || nextPayday <= today) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Could not determine the next payday in the future." }),
      };
    }

    console.log(`Next payday determined: ${nextPayday}`);

    // Fetch ledger entries up to the next payday
    console.log(`Fetching ledger entries from ${today.toISOString()} to ${nextPayday.toISOString()} for householdId: ${householdId}`);
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        transactionDate: {
          gte: today,
          lte: nextPayday,
        },
      },
      orderBy: [
        { transactionDate: 'asc' },
        { createdAt: 'asc' } // Ensure the entries are ordered by both date and creation time
      ],
    });

    console.log(`Ledger entries found: ${JSON.stringify(ledgerEntries)}`);

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
      console.log(`Most recent ledger entry found: ${JSON.stringify(recentLedgerEntry)}`);

      const safeToSpend = recentLedgerEntry ? parseFloat(recentLedgerEntry.runningTotal) : 0.00;
      console.log(`No ledger entries found. Returning running total from the most recent ledger entry: ${safeToSpend}`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          safeToSpend: safeToSpend,
          nextPayday: nextPayday.toISOString(),
        }),
      };
    }

    // Find the lowest running total
    const lowestRunningTotal = ledgerEntries.reduce((lowest, entry) => {
      const runningTotal = new Decimal(entry.runningTotal);
      return runningTotal.lessThan(lowest) ? runningTotal : lowest;
    }, new Decimal(ledgerEntries[0].runningTotal));

    console.log(`Lowest running total determined: ${lowestRunningTotal}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        safeToSpend: lowestRunningTotal.toNumber(),
        nextPayday: nextPayday.toISOString(),
      }),
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
