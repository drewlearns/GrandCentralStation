const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid'); // Import UUID to generate unique transaction IDs

const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { familyId } = JSON.parse(event.body);

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

        // Create an initial dummy ledger for the family
        await prisma.transactionLedger.create({
            data: {
                transactionId: uuidv4(),
                familyId: familyId,
                amount: 0.0, // Zero dollars to indicate no initial transaction
                transactionType: 'Initialization', // Descriptive type for the initial ledger
                transactionDate: new Date(),
                category: 'Initial Setup', // A category for initial setup
                description: 'Initially created ledger', // Descriptive label for this entry
                createdAt: new Date(),
                updatedAt: new Date(),
                updatedBy: '', // This should be adjusted to the user who initiates the setup
            },
        });

        console.log(`Success: Initial dummy ledger created for family ${familyId}`);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Initial dummy ledger created successfully',
            }),
        };
    } catch (error) {
        console.error(`Error creating initial ledger: ${error.message}`, {
            familyId: familyId,
            errorDetails: error,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error creating initial dummy ledger',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
