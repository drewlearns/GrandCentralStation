const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const body = event.body ? JSON.parse(event.body) : event;

    if (!body) {
        console.error('No data received in request body');
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'No data received in request body.' }),
        };
    }

    try {
        const { userUuid, billId, title, message, dueDate } = body;

        console.log('Parsed body:', JSON.stringify(body, null, 2));

        // Verify required fields
        const requiredFields = ['userUuid', 'billId', 'title', 'message', 'dueDate'];
        for (const field of requiredFields) {
            if (!body[field]) {
                console.log(`Missing required field: ${field}`);
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: `Missing required field: ${field}` }),
                };
            }
        }

        // Fetch the user's email address
        const user = await prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { email: true },
        });

        if (!user) {
            console.error('User not found');
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'User not found' }),
            };
        }

        const userEmail = user.email;
        console.log('Fetched user email:', userEmail);

        // Check if the bill exists
        const billExists = await prisma.bill.findUnique({
            where: { billId: billId },
        });

        if (!billExists) {
            console.error('Bill not found');
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Bill not found' }),
            };
        }

        // Creating notification
        const notificationData = {
            notificationId: uuidv4(),
            userUuid,
            billId,
            title,
            message,
            dueDate: new Date(dueDate),
            read: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        console.log('Creating notification with data:', JSON.stringify(notificationData, null, 2));

        const notification = await prisma.notification.create({
            data: notificationData,
        });

        console.log('Notification created successfully:', JSON.stringify(notification, null, 2));

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Notification created successfully.', notification }),
        };
    } catch (error) {
        console.error('Error adding notification:', error);

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
