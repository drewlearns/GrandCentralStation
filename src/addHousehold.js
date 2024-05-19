const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const { authorizationToken, householdName, customHouseholdNameSuchAsCrew, account, ipAddress, deviceDetails } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }

    let createdBy;

    try {
        // Invoke verifyToken Lambda function
        const verifyTokenCommand = new InvokeCommand({
            FunctionName: 'verifyToken', // Replace with the actual function name
            Payload: JSON.stringify({ authorizationToken })
        });

        const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
        const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));
        
        if (verifyTokenResponse.FunctionError) {
            throw new Error(payload.errorMessage || 'Token verification failed.');
        }

        createdBy = payload.username;
        if (!createdBy) {
            throw new Error('Token verification did not return a valid UUID.');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Invalid token.',
                error: error.message,
            }),
        };
    }

    try {
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

        const householdExists = await prisma.household.findFirst({
            where: {
                householdName: householdName,
                members: {
                    some: {
                        memberUuid: createdBy,
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
            const household = await prisma.household.create({
                data: {
                    householdId: uuidv4(),
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

            const existingInitialLedger = await prisma.ledger.findFirst({
                where: {
                    householdId: household.householdId,
                    transactionType: 'Initialization',
                },
            });

            if (!existingInitialLedger) {
                await prisma.ledger.create({
                    data: {
                        ledgerId: uuidv4(),
                        householdId: household.householdId,
                        amount: 0.0,
                        runningTotal: 0.0,
                        transactionType: 'Initialization',
                        transactionDate: new Date(),
                        category: 'Initial Setup',
                        description: 'Initially created ledger',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        updatedBy: createdBy,
                        status: true,
                    },
                });
            }

            return household;
        });

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
                householdId: result.householdId,
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
