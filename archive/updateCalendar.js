const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { startDate, endDate, familyId } = JSON.parse(event.body);  // Expecting startDate, endDate, and familyId in the request body

    try {
        // Retrieve all transactions affecting the calendar within the date range
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

        let cumulativeTotal = 0;

        for (const transaction of transactions) {
            // Adjust the cumulative total based on the transaction type
            if (transaction.transactionType.toLowerCase() === 'income') {
                cumulativeTotal += transaction.amount;
            } else {
                cumulativeTotal -= transaction.amount;
            }

            // Update or create calendar entries for each transaction date
            const existingCalendar = await prisma.calendar.findFirst({
                where: {
                    familyId: familyId,
                    eventDate: transaction.transactionDate
                }
            });

            if (existingCalendar) {
                // Update the existing calendar entry
                await prisma.calendar.update({
                    where: { dateId: existingCalendar.dateId },
                    data: {
                        eventName: 'Financial Update',
                        description: transaction.description,
                        transactionId: transaction.transactionId,
                        family: { connect: { familyId: familyId } }
                    }
                });
            } else {
                // Create a new calendar entry
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

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Calendar successfully updated with transactions',
                familyId: familyId
            }),
        };
    } catch (error) {
        console.error(`Error updating calendar for family ${familyId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating the calendar',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
