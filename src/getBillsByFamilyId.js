const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { familyId } = JSON.parse(event.body);  // Expecting the familyId in the request body

    try {
        // Check if the family exists
        const familyExists = await prisma.family.findUnique({
            where: { familyId: familyId },
        });

        if (!familyExists) {
            console.log(`Error: Family ${familyId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Family not found',
                }),
            };
        }

        // Retrieve all bills for the specified familyId from the BillTable
        const bills = await prisma.billTable.findMany({
            where: {
                familyId: familyId
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bills retrieved successfully for the family',
                bills: bills
            }),
        };
    } catch (error) {
        console.error(`Error retrieving bills for family ${familyId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error retrieving bills for the family',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
