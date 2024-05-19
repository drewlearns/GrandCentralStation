const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { householdId, paymentSourceId } = event;

  try {
    if (!householdId || !paymentSourceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing householdId or paymentSourceId in the request',
        }),
      };
    }

    // Fetch all ledger entries for the household and payment source, ordered by transaction date
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        paymentSourceId: paymentSourceId,
      },
      orderBy: { transactionDate: 'asc' },
    });

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'No ledger entries found for the given household and payment source',
        }),
      };
    }

    // Calculate running totals for the specific payment source
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
        message: 'Running totals updated successfully for payment source',
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
