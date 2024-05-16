const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { transactionId } = body;

    // Validate input
    if (!transactionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing transactionId parameter" }),
      };
    }

    if (typeof transactionId !== "string" || transactionId.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid transactionId parameter" }),
      };
    }

    const sanitizedTransactionId = transactionId.trim();

    // Attempt to delete the transaction
    const deleteResult = await prisma.transactionLedger.delete({
      where: { transactionId: sanitizedTransactionId },
    });

    // Successful deletion
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Transaction deleted successfully",
        transactionId: sanitizedTransactionId,
      }),
    };
  } catch (error) {
    console.error(`Error deleting transaction: ${error.message}`, {
      errorDetails: error,
    });

    // Specific handling if the transaction does not exist
    if (error.code === 'P2025') {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Transaction not found",
          error: error.message,
        }),
      };
    }

    // General error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
