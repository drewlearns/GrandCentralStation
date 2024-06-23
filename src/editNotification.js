const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,PUT',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    const { notificationId, userUuid, title, message, dueDate } = JSON.parse(event.body);

    try {
        const updatedNotification = await prisma.notification.update({
            where: { notificationId },
            data: {
                userUuid,
                title,
                message,
                dueDate: new Date(dueDate),
                updatedAt: new Date()
            }
        });

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(updatedNotification)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: error.message })
        };
    } finally {
        await prisma.$disconnect();
    }
};
