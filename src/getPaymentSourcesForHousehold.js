const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

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

  let requestingUserUuid;

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

    requestingUserUuid = payload.username;
    if (!requestingUserUuid) {
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
    const household = await prisma.household.findUnique({
      where: { householdId: householdId },
      include: {
        members: true
      }
    });

    if (!household) {
      console.log(`Error: Household ${householdId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    const isMember = household.members.some(member => member.memberUuid === requestingUserUuid);

    if (!isMember) {
      console.log(`Error: User ${requestingUserUuid} is not a member of household ${householdId}`);
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: 'You do not have permission to view payment sources for this household',
        }),
      };
    }

    const paymentSources = await prisma.paymentSource.findMany({
      where: { householdId: householdId },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Payment sources retrieved successfully",
        paymentSources: paymentSources,
      }),
    };
  } catch (error) {
    console.error(`Error retrieving payment sources: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error retrieving payment sources",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
