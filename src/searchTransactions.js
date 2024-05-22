const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, query } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  let username;
  let userUuid;

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
    // Get the user UUID
    const user = await prisma.user.findFirst({
      where: { username: username },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    userUuid = user.uuid;

    // Find households the user is associated with
    const userHouseholds = await prisma.household.findMany({
      where: {
        members: {
          some: {
            memberUuid: userUuid,
          }
        }
      },
      select: {
        householdId: true
      }
    });

    const householdIds = userHouseholds.map(household => household.householdId);

    if (householdIds.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No associated households found" }),
      };
    }

    // Search ledgers
    const ledgers = await prisma.ledger.findMany({
      where: {
        householdId: { in: householdIds },
        OR: [
          { amount: { equals: parseFloat(query) } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    if (ledgers.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No transactions found matching the query" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Transactions retrieved successfully",
        transactions: ledgers,
      }),
    };
  } catch (error) {
    console.error(`Error retrieving transactions: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error retrieving transactions",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
