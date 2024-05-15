const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { userId } = JSON.parse(event.body);  // Expecting the userId in the request body

    try {
        // Check if the user exists in the User table
        const userExists = await prisma.user.findUnique({
            where: { uuid: userId },
        });

        if (!userExists) {
            console.log(`Error: User ${userId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User not found',
                }),
            };
        }

        // Get all families where the user is a member
        const familyMemberships = await prisma.familyMembers.findMany({
            where: { memberUuid: userId },
            include: {
                family: {
                    include: {
                        members: {
                            include: {
                                user: true
                            }
                        }
                    }
                }
            }
        });

        // Extract and format the family details along with member information
        const families = familyMemberships.map(({ family }) => ({
            familyId: family.familyId,
            familyName: family.familyName,
            members: family.members.map(member => ({
                memberUuid: member.memberUuid,
                role: member.role,
                joinedDate: member.joinedDate,
                userInfo: {
                    uuid: member.user.uuid,
                    name: `${member.user.firstName} ${member.user.lastName}`,
                    email: member.user.email,
                }
            }))
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Families and members retrieved successfully',
                families: families,
            }),
        };
    } catch (error) {
        console.error(`Error retrieving families for user ${userId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error retrieving families',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
