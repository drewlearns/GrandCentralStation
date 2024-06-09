const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, householdId } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
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

    if (!householdId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing householdId parameter" }),
      };
    }

    await prisma.$connect();

    // Get the current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const incomes = await prisma.incomes.findMany({
      where: { householdId: householdId },
      include: {
        ledgers: {
          where: {
            transactionDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        },
      },
    });

    if (incomes.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No incomes found for the given householdId" }),
      };
    }

    // Flatten the structure to top-level array and filter by current month
    const ledgerEntries = incomes.flatMap(income =>
      income.ledgers.map(ledger => ({
        incomeId: income.incomeId,
        name: income.name,
        amount: ledger.amount,
        payday: ledger.transactionDate,
      }))
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ incomes: ledgerEntries }),
    };
  } catch (error) {
    console.error('Error retrieving incomes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving incomes", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
