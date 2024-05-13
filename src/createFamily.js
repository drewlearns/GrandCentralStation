const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const { familyName, createdBy, customFamilyName, account } = JSON.parse(event.body);
    const familyId = uuidv4();  // Unique ID for the family

    try {
        // Check if the user with createdBy exists in the User table
        const userExists = await prisma.user.findUnique({
            where: { uuid: createdBy },
        });

        if (!userExists) {
            console.log(`Error: User ${createdBy} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User not found',
                }),
            };
        }

        const result = await prisma.$transaction(async (prisma) => {
            // Create the family record
            const family = await prisma.family.create({
                data: {
                    familyId: familyId,
                    familyName: familyName,
                    customFamilyNameSuchAsCrew: customFamilyName,
                    creationDate: new Date(),
                    createdAt: new Date(),  // Set createdAt for Family
                    updatedAt: new Date(),  // Set updatedAt for Family
                    account: account,
                    setupComplete: false,
                    activeSubscription: false,
                    members: {
                        create: [{
                            id: uuidv4(),  // Ensure a unique ID for FamilyMembers
                            memberUuid: createdBy,
                            role: 'creator',
                            joinedDate: new Date(),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }],
                    },
                },
            });

            return family;
        });

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Family created successfully',
                familyId: familyId,
                familyName: familyName,
                customFamilyName: customFamilyName,
                account: account,
            }),
        };
    } catch (error) {
        console.error('Error creating family:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error creating family',
                error: error.message,
            }),
        };
    }
};
