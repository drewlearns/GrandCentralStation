const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { householdId } = event;

  try {
    // Fetch all ledger entries for the household, ordered by transaction date
    const ledgerEntries = await prisma.ledger.findMany({
      where: { householdId: householdId },
      orderBy: { transactionDate: 'asc' },
    });

    // Calculate running totals
    let runningTotal = 0;
    for (let entry of ledgerEntries) {
      runningTotal += entry.transactionType.toLowerCase() === 'debit' ? -entry.amount : entry.amount;
      await prisma.ledger.update({
        where: { ledgerId: entry.ledgerId },
        data: { runningTotal: runningTotal },
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Running totals updated successfully',
      }),
    };
  } catch (error) {
    console.error(`Error calculating running totals: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error calculating running totals',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
