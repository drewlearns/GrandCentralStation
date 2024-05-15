const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { billId, updates } = JSON.parse(event.body);  // Expecting the billId and updates in the request body

    try {
        // Check if the bill exists
        const billExists = await prisma.billTable.findUnique({
            where: { billId: billId },
        });

        if (!billExists) {
            console.log(`Error: Bill ${billId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Bill not found',
                }),
            };
        }

        // Update the bill in the BillTable
        const updatedBill = await prisma.billTable.update({
            where: { billId: billId },
            data: updates,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bill successfully updated',
                bill: updatedBill
            }),
        };
    } catch (error) {
        console.error(`Error updating bill ${billId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating the bill',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
