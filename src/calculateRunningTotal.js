const { PrismaClient } = require("@prisma/client");
const Decimal = require("decimal.js");

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

    // Fetch all ledger entries for the household and payment source, ordered by transaction date ascending
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

    // Initialize the running total from the previous entry's running total if it exists
    let runningTotal = new Decimal(0);
    const firstTransactionDate = ledgerEntries[0].transactionDate;
    const previousEntry = await prisma.ledger.findFirst({
      where: {
        householdId: householdId,
        paymentSourceId: paymentSourceId,
        transactionDate: {
          lt: firstTransactionDate,
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    if (previousEntry) {
      runningTotal = new Decimal(previousEntry.runningTotal);
    }

    // Calculate running totals for the specific payment source, ordered by transaction date
    for (let entry of ledgerEntries) {
      runningTotal = entry.transactionType.toLowerCase() === 'debit'
        ? runningTotal.minus(new Decimal(entry.amount))
        : runningTotal.plus(new Decimal(entry.amount));
    
      console.log(`Updated running total after entry: ${runningTotal.toFixed(2)}`);
      
      await prisma.ledger.update({
        where: { ledgerId: entry.ledgerId },
        data: { runningTotal: parseFloat(runningTotal.toFixed(2)) },
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
