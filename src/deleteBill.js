const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios'); // Ensure axios is installed for making HTTP requests

const UPDATE_RUNNING_TOTAL_URL = process.env.API_URL; // Ensure this is set in your environment

exports.handler = async (event) => {
    const { billId } = JSON.parse(event.body);  // Expecting the billId in the request body

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

        // Store the familyId before deleting the bill
        const familyId = billExists.familyId;

        // Delete the bill from the BillTable
        await prisma.billTable.delete({
            where: { billId: billId },
        });

        // Trigger updateRunningTotals after the bill is deleted
        await axios.post(`${UPDATE_RUNNING_TOTAL_URL}/updateRunningTotal`, { familyId: familyId });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bill successfully deleted',
            }),
        };
    } catch (error) {
        console.error(`Error deleting bill ${billId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error deleting the bill',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
