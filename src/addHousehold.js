const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

exports.handler = async (event) => {
    const { authorizationToken, householdName } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
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
            headers: corsHeaders,
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
            return {
                statusCode: 404,
                headers: corsHeaders,
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
            return {
                statusCode: 409,
                headers: corsHeaders,
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
                    creationDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
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

            // Create a default payment source
            const defaultPaymentSource = await prisma.paymentSource.create({
                data: {
                    sourceId: uuidv4(),
                    householdId: household.householdId,
                    sourceName: 'Default Payment Source',
                    sourceType: 'Default Type', // Add a suitable default type
                    description: 'Default payment source for household', // Add a suitable default description
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            // Create a preference entry for the default payment source
            await prisma.preferences.create({
                data: {
                    preferenceId: uuidv4(),
                    householdId: household.householdId,
                    preferenceType: 'Payment Source',
                    preferenceValue: defaultPaymentSource.sourceId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const existingInitialLedger = await prisma.ledger.findFirst({
                where: {
                    householdId: household.householdId,
                    transactionType: 'Credit',
                },
            });

            if (!existingInitialLedger) {
                await prisma.ledger.create({
                    data: {
                        ledgerId: uuidv4(),
                        householdId: household.householdId,
                        paymentSourceId: defaultPaymentSource.sourceId,
                        amount: 0.0,
                        runningTotal: 0.0,
                        transactionType: 'Credit',
                        transactionDate: new Date(),
                        category: 'Initial Setup',
                        description: 'Initially created ledger - This can be deleted',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        updatedBy: createdBy,
                        status: true,
                    },
                });
            }

            return household;
        });

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Household created successfully',
                householdId: result.householdId,
                householdName: householdName,
            }),
        };
    } catch (error) {
        console.error('Error creating household:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error creating household',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
