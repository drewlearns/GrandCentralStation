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
    
    // Fetch all incomes for the household
    const incomes = await prisma.incomes.findMany({
      where: { householdId: householdId },
    });

    if (incomes.length === 0) {
      return {
        statusCode: 404,
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
        } else if (frequency === 'semimonthly') {
          if (payday.getDate() <= 15) {
            payday.setDate(15);
          } else {
            payday.setMonth(payday.getMonth() + 1);
            payday.setDate(1);
          }
        } else {
          throw new Error(`Unsupported income frequency: ${income.frequency}`);
        }
      }

      if (!nextPayday || payday < nextPayday) {
        nextPayday = payday;
      }
    }

    if (!nextPayday) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Could not determine the next payday." }),
      };
    }

    // Fetch ledger entries up to the next payday
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        transactionDate: {
          gte: today,
          lte: nextPayday,
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No ledger entries found up to the next payday." }),
      };
    }

    // Find the lowest running total
    const lowestRunningTotal = ledgerEntries.reduce((lowest, entry) => {
      const runningTotal = new Decimal(entry.runningTotal);
      return runningTotal.lessThan(lowest) ? runningTotal : lowest;
    }, new Decimal(ledgerEntries[0].runningTotal));

    return {
      statusCode: 200,
      body: JSON.stringify({
        safeToSpend: lowestRunningTotal.toFixed(2),
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
