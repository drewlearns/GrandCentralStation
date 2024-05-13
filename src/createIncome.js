const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

exports.handler = async (event) => {
    // Parse the event body to get income details
    const { familyId, name, amount, frequency, firstPayDay } = JSON.parse(event.body);

    try {
        // Check if the specified family exists
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

        // Check if an income with the same name already exists for the family
        const incomeExists = await prisma.incomes.findFirst({
            where: {
                familyId: familyId,
                name: name,
            },
        });

        if (incomeExists) {
            console.log(`Error: Income with name '${name}' already exists for family ${familyId}`);
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Income with the same name already exists',
                }),
            };
        }

        // Create a new income record
        await prisma.incomes.create({
            data: {
                incomeId: uuidv4(), // Generate a unique income ID using uuidv4
                familyId: familyId,
                name: name,
                amount: amount,
                frequency: frequency,
                firstPayDay: firstPayDay,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        console.log(`Success: Income created for family ${familyId}`);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Income created successfully',
            }),
        };
    } catch (error) {
        console.error(`Error creating income: ${error.message}`, {
            familyId: familyId,
            errorDetails: error,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error creating income',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
