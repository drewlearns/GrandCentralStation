const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { familyId, memberUuid } = JSON.parse(event.body);  // Expecting the familyId and memberUuid in the request body

    try {
        // Find the specific family member record to get its id
        const member = await prisma.familyMembers.findFirst({
            where: {
                familyId: familyId,
                memberUuid: memberUuid
            }
        });

        if (!member) {
            console.log(`Error: Member ${memberUuid} in Family ${familyId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Member not found in the specified family',
                }),
            };
        }

        // Delete the member from the family using the found id
        await prisma.familyMembers.delete({
            where: {
                id: member.id  // Using the unique id of the FamilyMembers record
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Member successfully deleted from the family',
            }),
        };
    } catch (error) {
        console.error(`Error deleting member ${memberUuid} from family ${familyId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error deleting member from the family',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
