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

    // Query the database for the transaction
    const transaction = await prisma.transactionLedger.findUnique({
      where: { transactionId: sanitizedTransactionId },
      include: { attachments: true }, // Assuming you want attachments based on previous pattern
    });

    // Check if the transaction exists
    if (!transaction) {
      console.log(`Error: Transaction ${sanitizedTransactionId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Transaction not found" }),
      };
    }

    // Successful response
    return {
      statusCode: 200,
      body: JSON.stringify(transaction),
    };
  } catch (error) {
    console.error(`Error retrieving transaction: ${error.message}`, {
      errorDetails: error,
    });

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
