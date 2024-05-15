const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { transactionId, familyId, amount, transactionType, transactionDate, category, description, updatedBy } = body;

    if (!transactionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing transactionId parameter" }),
      };
    }

    if (!familyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing familyId parameter" }),
      };
    }

    if (!amount || !transactionType || !transactionDate || !category || !description || !updatedBy) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing one or more required parameters" }),
      };
    }

    const sanitizedTransactionId = transactionId.trim();
    const sanitizedFamilyId = familyId.trim();

    // Ensure the transaction exists
    const transactionExists = await prisma.transactionLedger.findUnique({
      where: { transactionId: sanitizedTransactionId },
    });

    if (!transactionExists) {
      console.log(`Error: Transaction ${sanitizedTransactionId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Transaction not found" }),
      };
    }

    // Ensure the family exists
    const familyExists = await prisma.family.findUnique({
      where: { familyId: sanitizedFamilyId },
    });

    if (!familyExists) {
      console.log(`Error: Family ${sanitizedFamilyId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Family not found" }),
      };
    }

    // Update the transaction
    const updatedTransaction = await prisma.transactionLedger.update({
      where: { transactionId: sanitizedTransactionId },
      data: {
        familyId: sanitizedFamilyId,
        amount: parseFloat(amount),
        transactionType: transactionType,
        transactionDate: new Date(transactionDate),
        category: category,
        description: description,
        updatedAt: new Date(),
        updatedBy: updatedBy,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Transaction updated successfully",
        transaction: updatedTransaction,
      }),
    };
  } catch (error) {
    console.error(`Error updating transaction: ${error.message}`, {
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
