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

async function getDefaultPaymentSource(householdId) {
  const preference = await prisma.preferences.findFirst({
    where: {
      AND: [
        { householdId: householdId },
        { preferenceType: 'defaultPaymentSource' }
      ]
    }
  });

  return preference ? preference.preferenceValue : null;
}

async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken', // Ensure this is the correct Lambda function name
    Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
  };

  const command = new InvokeCommand(params);
  const response = await lambdaClient.send(command);

  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  if (payload.errorMessage) {
    throw new Error(payload.errorMessage);
  }

  const nestedPayload = JSON.parse(payload.body);
  console.log("verifyToken nested payload:", nestedPayload);

  return nestedPayload;
}

exports.handler = async (event) => {
  const { authToken, householdId } = JSON.parse(event.body);

  if (!authToken) {
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

  let userId;

  try {
    const tokenPayload = await verifyToken(authToken);
    userId = tokenPayload.user_id;
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

  try {
    const householdMembers = await prisma.householdMembers.findMany({
      where: {
        householdId: householdId,
      },
      select: {
        memberUuid: true,
      },
    });

    const memberUuids = householdMembers.map(member => member.memberUuid);

    if (!memberUuids.includes(userId)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. User is not a member of the household.'
        }),
      };
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const defaultPaymentSourceId = await getDefaultPaymentSource(householdId);
    if (!defaultPaymentSourceId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Default payment source not set.'
        }),
      };
    }

    const incomes = await prisma.incomes.findMany({
      where: { householdId: householdId },
    });

    if (incomes.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          safeToSpend: 0.0,
          nextPayday: "n/a",
        }),
      };
    }

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
        body: JSON.stringify({ message: "Could not determine the next payday in the future." }),
      };
    }

    const dayBeforeNextPayday = new Date(nextPayday);
    dayBeforeNextPayday.setDate(nextPayday.getDate() - 1);
    dayBeforeNextPayday.setUTCHours(23, 59, 59, 999);

    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        paymentSourceId: defaultPaymentSourceId,
        transactionDate: {
          gte: today,
          lte: dayBeforeNextPayday,
        },
      },
      orderBy: [
        { transactionDate: 'asc' },
        { createdAt: 'asc' }
      ],
    });

    if (ledgerEntries.length === 0) {
      const recentLedgerEntry = await prisma.ledger.findFirst({
        where: {
          householdId: householdId,
          paymentSourceId: defaultPaymentSourceId,
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
