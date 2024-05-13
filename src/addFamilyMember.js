const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid'); // Ensure UUIDs are generated where needed

exports.handler = async (event) => {
    const { familyId, memberUuid, role } = JSON.parse(event.body);

    try {
        // Check if the family exists in the Family table
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

        // Check if the user is already a member of the family
        const existingMembers = await prisma.familyMembers.findMany({
            where: {
                familyId: familyId,
                memberUuid: memberUuid,
            },
        });

        if (existingMembers.length > 0) {
            console.log(`Conflict: User ${memberUuid} already exists in family ${familyId}`);
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'User already exists in the family',
                }),
            };
        }

        // Add the new family member
        const newMember = await prisma.familyMembers.create({
            data: {
                id: uuidv4(),  // Generate a unique ID for the FamilyMembers record
                familyId: familyId,
                memberUuid: memberUuid,
                role: role,
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        console.log(`Success: Added member ${memberUuid} to family ${familyId}`);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Family member added successfully',
                member: newMember,
            }),
        };
    } catch (error) {
        console.error(`Error adding family member: ${error.message}`, {
            familyId: familyId,
            memberUuid: memberUuid,
            errorDetails: error
        });

        // Handle specific errors related to unique constraints
        if (error.code === 'P2002') {
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Unique constraint violation',
                    detail: 'Cannot add duplicate family member.',
                }),
            };
        }

        // Handle foreign key constraint failure more specifically
        if (error.code === 'P2003') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Foreign key constraint failed',
                    detail: 'Invalid familyId or memberUuid provided.',
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error adding family member',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
