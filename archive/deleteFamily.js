const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { familyId } = JSON.parse(event.body);

    try {
        // Start a transaction to handle all deletions atomically
        const result = await prisma.$transaction(async (prisma) => {
            // Check if the family exists using familyId
            const familyExists = await prisma.family.findUnique({
                where: { familyId: familyId },
            });

            if (!familyExists) {
                console.log(`Error: No family found with familyId '${familyId}'`);
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: 'Family not found',
                    }),
                };
            }

            // Delete Attachments related to TransactionLedger entries for this family
            const transactionIds = await prisma.transactionLedger.findMany({
                where: { familyId },
                select: { transactionId: true }
            });
            const transactionIdsList = transactionIds.map(t => t.transactionId);
            await prisma.attachments.deleteMany({
                where: { transactionId: { in: transactionIdsList } }
            });

            // Delete related records in all associated tables
            await prisma.familyMembers.deleteMany({ where: { familyId } });
            await prisma.incomes.deleteMany({ where: { familyId } });

            // Delete TransactionLedger after deleting related Attachments
            await prisma.transactionLedger.deleteMany({ where: { familyId } });

            await prisma.calendar.deleteMany({ where: { familyId } });
            await prisma.billTable.deleteMany({ where: { familyId } });
            await prisma.preferences.deleteMany({ where: { familyId } });
            await prisma.invitations.deleteMany({ where: { familyId } });
            await prisma.categories.deleteMany({ where: { familyId } });

            // Finally, delete the family record
            await prisma.family.delete({
                where: { familyId: familyId },
            });

            console.log(`Success: Family ${familyId} deleted with all related data`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Family and all related data deleted successfully',
                }),
            };
        });

        return result;
    } catch (error) {
        console.error(`Error deleting family: ${error.message}`, {
            familyId: familyId,
            errorDetails: error,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error deleting family',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
