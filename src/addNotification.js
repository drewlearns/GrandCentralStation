const { PrismaClient } = require('@prisma/client');
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

    const { userUuid, billId, title, message, dueDate } = JSON.parse(event.body);

    try {
        const newNotification = await prisma.notification.create({
            data: {
                userUuid,
                billId,
                title,
                message,
                read: false,
                dueDate: new Date(dueDate),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(newNotification)
        };
    } catch (error) {
        console.error('Error creating notification:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message })
        };
    } finally {
        await prisma.$disconnect();
    }
};
