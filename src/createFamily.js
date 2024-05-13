const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const { familyName, createdBy, customFamilyName, account } = JSON.parse(event.body);
    const familyId = uuidv4();

    try {
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
                            memberUuid: createdBy,
                            role: 'creator',
                            joinedDate: new Date(),  // Ensure joinedDate for FamilyMembers
                            createdAt: new Date(),  // Set createdAt for FamilyMembers
                            updatedAt: new Date(),  // Set updatedAt for FamilyMembers
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
