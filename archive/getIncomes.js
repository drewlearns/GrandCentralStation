const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    // Parse the event to get familyId
    const { familyId } = JSON.parse(event.body);

    try {
        // Retrieve all income records associated with the provided familyId
        const incomes = await prisma.incomes.findMany({
            where: {
                familyId: familyId,
            },
        });

        if (incomes.length === 0) {
            console.log(`Info: No incomes found for family '${familyId}'`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'No incomes found for this family',
                }),
            };
        }

        console.log(`Success: Retrieved incomes for family '${familyId}'`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Incomes retrieved successfully',
                incomes: incomes,
            }),
        };
    } catch (error) {
        console.error(`Error retrieving incomes: ${error.message}`, {
            familyId: familyId,
            errorDetails: error,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error retrieving incomes',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
