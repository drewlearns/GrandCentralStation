const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const prisma = new PrismaClient();

exports.handler = async (event) => {
    const { householdName, createdBy, customHouseholdNameSuchAsCrew, account, ipAddress, deviceDetails } = JSON.parse(event.body);
    const householdId = uuidv4(); // Unique ID for the household

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

        // Check if the household with the same householdName and createdBy already exists
        const householdExists = await prisma.household.findFirst({
            where: {
                householdName: householdName,
                members: {
                    some: {
                        memberUuid: createdBy,
                        role: 'Owner',
                    },
                },
            },
        });

        if (householdExists) {
            console.log(`Error: Household with name ${householdName} already exists for user ${createdBy}`);
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Household already exists',
                }),
            };
        }

        const result = await prisma.$transaction(async (prisma) => {
            // Create the household record
            const household = await prisma.household.create({
                data: {
                    householdId: householdId,
                    householdName: householdName,
                    customHouseholdNameSuchAsCrew: customHouseholdNameSuchAsCrew,
                    creationDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    account: account,
                    setupComplete: false,
                    activeSubscription: false,
                    members: {
                        create: [
                            {
                                id: uuidv4(),
                                memberUuid: createdBy,
                                role: 'Owner',
                                joinedDate: new Date(),
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        ],
                    },
                },
            });

            // Check if an initial dummy ledger already exists for the household
            const existingInitialLedger = await prisma.ledger.findFirst({
                where: {
                    householdId: householdId,
                    transactionType: 'Initialization',
                },
            });

            if (!existingInitialLedger) {
                // Create an initial dummy ledger for the household
                await prisma.ledger.create({
                    data: {
                        ledgerId: uuidv4(),
                        householdId: householdId,
                        amount: 0.0,
                        runningTotal: 0.0,
                        transactionType: 'Initialization',
                        transactionDate: new Date(),
                        category: 'Initial Setup',
                        description: 'Initially created ledger',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        updatedBy: createdBy,
                    },
                });
            }

            return household;
        });

        // Log an entry in the AuditTrail
        await prisma.auditTrail.create({
            data: {
                auditId: uuidv4(),
                tableAffected: 'Household',
                actionType: 'Create',
                oldValue: '',
                newValue: JSON.stringify(result),
                changedBy: createdBy,
                changeDate: new Date(),
                timestamp: new Date(),
                device: deviceDetails,
                ipAddress: ipAddress,
                deviceType: '',
                ssoEnabled: 'false',
            },
        });

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Household created successfully',
                householdId: householdId,
                householdName: householdName,
                customHouseholdName: customHouseholdNameSuchAsCrew,
                account: account,
            }),
        };
    } catch (error) {
        console.error('Error creating household:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error creating household',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
