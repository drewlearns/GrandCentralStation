import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const { email, mailOptIn, firstName, lastName, uuid } = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    try {
        // Check if the email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'User with this email already exists' }),
            };
        }

        const newUser = await prisma.user.create({
            data: {
                uuid,
                firstName,
                lastName,
                email,
                signupDate: new Date(),
                mailOptIn,
                createdAt: new Date(),
                updatedAt: new Date(),
                confirmedEmail: false,
            },
        });

        const newHousehold = await prisma.household.create({
            data: {
                householdName: `${lastName} Household`,
                creationDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                setupComplete: false,
                activeSubscription: false,
            },
        });

        const newHouseholdMember = await prisma.householdMembers.create({
            data: {
                householdId: newHousehold.householdId,
                memberUuid: newUser.uuid,
                role: 'owner',
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        const newPaymentSource = await prisma.paymentSource.create({
            data: {
                householdId: newHousehold.householdId,
                sourceName: `${firstName} ${lastName} Payment Source - ${timestamp}`,
                sourceType: 'bank_account',
                description: 'Default payment source created during user signup',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        const newTransaction = await prisma.transaction.create({
            data: {
                ledgerId: newHousehold.householdId, // Assuming ledgerId is the same as householdId for simplicity
                sourceId: newPaymentSource.sourceId,
                amount: 0.0,
                transactionDate: new Date(),
                description: 'Initial transaction during user signup',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'User created successfully',
                user: newUser,
                household: newHousehold,
                paymentSource: newPaymentSource,
                transaction: newTransaction,
            }),
        };

    } catch (error) {
        console.error('Error creating user:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
