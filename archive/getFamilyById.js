const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { familyId } = JSON.parse(event.body);  // Expecting the familyId in the request body

    try {
        // Find the family by its familyId, including members
        const family = await prisma.family.findUnique({
            where: { familyId: familyId },
            include: {
                members: {
                    include: {
                        user: true  // Assuming each member has associated user details
                    }
                }
            }
        });

        if (!family) {
            console.log(`Error: Family ${familyId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Family not found',
                }),
            };
        }

        // Construct a custom family name if needed, modify as per your rules
        const customFamilyName = `Custom Name for ${family.familyName}`;

        // Extract and format member details
        const members = family.members.map(member => ({
            memberUuid: member.memberUuid,
            role: member.role,
            joinedDate: member.joinedDate,
            userInfo: {
                uuid: member.user.uuid,
                name: `${member.user.firstName} ${member.user.lastName}`,
                email: member.user.email,
            }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Family details and members retrieved successfully',
                family: {
                    familyId: family.familyId,
                    familyName: family.familyName,
                    customFamilyName: customFamilyName,
                    members: members
                }
            }),
        };
    } catch (error) {
        console.error(`Error retrieving family with ID ${familyId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error retrieving family',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
