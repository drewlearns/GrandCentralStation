const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    // Parse the event body to get income details
    const { familyId, currentName, newName, amount, frequency, firstPayDay } = JSON.parse(event.body);

    try {
        // Find the income using familyId and currentName to uniquely identify it
        const incomeExists = await prisma.incomes.findFirst({
            where: {
                familyId: familyId,
                name: currentName,
            },
        });

        if (!incomeExists) {
            console.log(`Error: No income found with name '${currentName}' for family ${familyId}`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Income not found',
                }),
            };
        }

        // Update the income record using the identified incomeId
        const updatedIncome = await prisma.incomes.update({
            where: { incomeId: incomeExists.incomeId },
            data: {
                name: newName || currentName, // Use newName if provided; otherwise, retain currentName
                amount: amount,
                frequency: frequency,
                firstPayDay: firstPayDay,
                updatedAt: new Date(),
            },
        });

        console.log(`Success: Income for family ${familyId} updated`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Income updated successfully',
                income: updatedIncome,
            }),
        };
    } catch (error) {
        console.error(`Error updating income: ${error.message}`, {
            familyId: familyId,
            currentName: currentName,
            errorDetails: error,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating income',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
