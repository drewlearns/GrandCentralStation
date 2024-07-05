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

    const { email, mailOptIn, firstName, lastName, uuid = uuidv4() } = parsedBody; // Generate UUID if not provided
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
                subscriptionStatus: 'trial',
                subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
        });
        console.log('User created:', newUser);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'User created successfully',
                user: newUser,
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
