const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { familyId, transactionData } = JSON.parse(event.body);

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

        // Create transaction in the ledger
        const createdTransaction = await prisma.transactionLedger.create({
            data: {
                familyId: familyId,
                amount: transactionData.amount,
                transactionType: transactionData.transactionType,
                transactionDate: transactionData.transactionDate,
                category: transactionData.category,
                description: transactionData.description,
                updatedBy: transactionData.updatedBy,
                // Add any other relevant fields here
            }
        });

        console.log(`Success: Ledger entry created for family ${familyId}`);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Ledger entry created successfully',
                transaction: createdTransaction,
            }),
        };
    } catch (error) {
        console.error(`Error creating ledger: ${error.message}`, {
            familyId: familyId,
            transactionData: transactionData,
            errorDetails: error,
        });

        // Handle specific errors
        if (error.code === 'P2002') {
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Unique constraint violation',
                    detail: 'Cannot create duplicate transaction.',
                }),
            };
        }

        // Handle foreign key constraint failure more specifically
        if (error.code === 'P2003') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Foreign key constraint failed',
                    detail: 'Invalid familyId provided.',
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error creating ledger entry',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
