const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCalendar(familyId, startDate, endDate) {
    const transactions = await prisma.transactionLedger.findMany({
        where: {
            familyId: familyId,
            transactionDate: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        },
        orderBy: { transactionDate: 'asc' }
    });

    for (const transaction of transactions) {
        const existingCalendar = await prisma.calendar.findFirst({
            where: {
                familyId: familyId,
                eventDate: transaction.transactionDate
            }
        });

        if (existingCalendar) {
            await prisma.calendar.update({
                where: { dateId: existingCalendar.dateId },
                data: {
                    eventName: 'Financial Update',
                    description: transaction.description,
                    transactionId: transaction.transactionId,
                }
            });
        } else {
            await prisma.calendar.create({
                data: {
                    eventName: 'Financial Update',
                    eventDate: transaction.transactionDate,
                    description: transaction.description,
                    transactionId: transaction.transactionId,
                    familyId: familyId,
                }
            });
        }
    }
}

exports.handler = async (event) => {
    const { familyId } = JSON.parse(event.body); // Expecting the familyId in the request body

    try {
        const transactions = await prisma.transactionLedger.findMany({
            where: { familyId: familyId },
            orderBy: { transactionDate: 'asc' }
        });

        let cumulativeTotal = 0;
        let firstDate = null;
        let lastDate = null;

        for (const transaction of transactions) {
            if (!firstDate || transaction.transactionDate < firstDate) {
                firstDate = transaction.transactionDate;
            }
            if (!lastDate || transaction.transactionDate > lastDate) {
                lastDate = transaction.transactionDate;
            }

            if (transaction.transactionType.toLowerCase() === 'debit') {
                cumulativeTotal -= transaction.amount;
            } else {
                cumulativeTotal += transaction.amount;
            }

            await prisma.transactionLedger.update({
                where: { transactionId: transaction.transactionId },
                data: { runningTotal: cumulativeTotal }
            });
        }

        // Update the calendar after all transactions are processed
        if (firstDate && lastDate) {
            await updateCalendar(familyId, firstDate, lastDate);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Running total and calendar successfully updated',
                familyId: familyId
            }),
        };
    } catch (error) {
        console.error(`Error updating running total and calendar for family ${familyId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating the running total and calendar',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
