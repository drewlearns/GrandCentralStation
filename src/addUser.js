import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
const prisma = new PrismaClient();

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event));

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(event.body);
        console.log('Parsed body:', parsedBody);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    const { email, mailOptIn, firstName, lastName, uuid } = parsedBody;
    const timestamp = new Date().toISOString();

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });

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
        console.log('User created:', newUser);

        const householdId = uuidv4();
        const newHousehold = await prisma.household.create({
            data: {
                householdId,
                householdName: `${lastName} Household`,
                creationDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                setupComplete: false,
                activeSubscription: false,
            },
        });
        console.log('Household created:', newHousehold);

        const newHouseholdMember = await prisma.householdMembers.create({
            data: {
                id: uuidv4(),
                householdId: newHousehold.householdId,
                memberUuid: newUser.uuid,
                role: 'owner',
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        console.log('Household member created:', newHouseholdMember);

        const paymentSourceId = uuidv4();
        const newPaymentSource = await prisma.paymentSource.create({
            data: {
                sourceId: paymentSourceId,
                householdId: newHousehold.householdId,
                sourceName: `${firstName} ${lastName} Payment Source - ${timestamp}`,
                sourceType: 'bank_account',
                description: 'Default payment source created during user signup',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        console.log('Payment source created:', newPaymentSource);

        const ledgerId = uuidv4();
        const newLedger = await prisma.ledger.create({
            data: {
                ledgerId,
                householdId: newHousehold.householdId,
                paymentSourceId: newPaymentSource.sourceId,
                amount: 0.0,
                transactionType: 'initial',
                transactionDate: new Date(),
                category: 'initial',
                description: 'Initial ledger entry during user signup',
                status: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                runningTotal: 0.0,
            },
        });
        console.log('Ledger created:', newLedger);

        const transactionId = uuidv4();
        const newTransaction = await prisma.transaction.create({
            data: {
                transactionId,
                ledgerId: newLedger.ledgerId,
                sourceId: newPaymentSource.sourceId,
                amount: 0.0,
                transactionDate: new Date(),
                description: 'Initial transaction during user signup',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        console.log('Transaction created:', newTransaction);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'User created successfully',
                user: newUser,
                household: newHousehold,
                paymentSource: newPaymentSource,
                ledger: newLedger,
                transaction: newTransaction,
            }),
        };

    } catch (error) {
        console.error('Error creating user:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error', details: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
