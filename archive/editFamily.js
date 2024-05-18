const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    // Parse the event body to get family details
    const { familyId, newFamilyName, newCustomFamilyName, newAccount, newActiveSubscription } = JSON.parse(event.body);

    try {
        // Find the family using familyId to uniquely identify it
        const familyExists = await prisma.family.findUnique({
            where: {
                familyId: familyId,
            },
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

        // Update the family record using the identified familyId
        const updatedFamily = await prisma.family.update({
            where: { familyId: familyId },
            data: {
                familyName: newFamilyName || familyExists.familyName, // Use newFamilyName if provided; otherwise, retain current familyName
                customFamilyNameSuchAsCrew: newCustomFamilyName || familyExists.customFamilyNameSuchAsCrew, // Use newCustomFamilyName if provided; otherwise, retain current customFamilyName
                account: newAccount || familyExists.account, // Use newAccount if provided; otherwise, retain current account
                activeSubscription: newActiveSubscription !== undefined ? newActiveSubscription : familyExists.activeSubscription, // Use newActiveSubscription if provided; otherwise, retain current activeSubscription
                updatedAt: new Date(),
            },
        });

        console.log(`Success: Family ${familyId} updated`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Family updated successfully',
                family: updatedFamily,
            }),
        };
    } catch (error) {
        console.error(`Error updating family: ${error.message}`, {
            familyId: familyId,
            errorDetails: error,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating family',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
