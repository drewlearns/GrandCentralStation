const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, ledgerId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!ledgerId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'No ledgerId provided.'
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
    // Find the ledger entry by ledgerId
    const ledgerEntry = await prisma.ledger.findUnique({
      where: { ledgerId: ledgerId },
    });

    if (!ledgerEntry) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Ledger entry not found" }),
      };
    }

    // Toggle the status field
    const updatedStatus = !ledgerEntry.status;

    // Update the ledger entry
    await prisma.ledger.update({
      where: { ledgerId: ledgerId },
      data: { status: updatedStatus },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Ledger entry ${ledgerId} status updated to ${updatedStatus}`,
      }),
    };
  } catch (error) {
    console.error('Error updating ledger entry:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error updating ledger entry", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
