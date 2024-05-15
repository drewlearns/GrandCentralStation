const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    // Parse the event body to get income details
    const { familyId, name } = JSON.parse(event.body);

    try {
        // Find the income using familyId and name to uniquely identify it
        const incomeExists = await prisma.incomes.findFirst({
            where: {
                familyId: familyId,
                name: name,
            },
        });

        if (!incomeExists) {
            console.log(`Error: No income found with name '${name}' for family ${familyId}`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Income not found',
                }),
            };
        }

        // Delete the income record using the identified incomeId
        await prisma.incomes.delete({
            where: { incomeId: incomeExists.incomeId },
        });

        console.log(`Success: Income with name '${name}' for family ${familyId} deleted`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Income deleted successfully',
            }),
        };
    } catch (error) {
        console.error(`Error deleting income: ${error.message}`, {
            familyId: familyId,
            name: name,
            errorDetails: error,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error deleting income',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
