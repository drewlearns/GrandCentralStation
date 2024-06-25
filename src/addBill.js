const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: JSON.stringify({ authToken: token }),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log('Token verification result:', JSON.stringify(result, null, 2)); // Log the result

    if (result.errorMessage) {
        throw new Error(result.errorMessage);
    }

    const payload = JSON.parse(result.body); // Parse the body to get the actual payload

    return payload;
}

function calculateFutureDates(startDate, frequency) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(new Date().setMonth(new Date().getMonth() + 12))) {
        dates.push(new Date(currentDate));

        switch (frequency) {
            case 'once':
                return dates;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'biweekly':
                currentDate.setDate(currentDate.getDate() + 14);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'bimonthly':
                currentDate.setMonth(currentDate.getMonth() + 2);
                break;
            case 'quarterly':
                currentDate.setMonth(currentDate.getMonth() + 3);
                break;
            case 'semiAnnually':
                currentDate.setMonth(currentDate.getMonth() + 6);
                break;
            case 'annually':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            default:
                throw new Error('Invalid frequency');
        }
    }
    return dates;
}

async function createNotification(ledgerEntry, userUuid) {
    const params = {
        FunctionName: 'addNotification', // Replace with your actual Lambda function name
        Payload: JSON.stringify({
            userUuid: userUuid,
            billId: ledgerEntry.billId,
            title: `Upcoming bill: ${ledgerEntry.category}`,
            message: `Your bill ${ledgerEntry.category} is due on ${ledgerEntry.transactionDate.toDateString()}`,
            dueDate: ledgerEntry.transactionDate
        }),
    };

    const command = new InvokeCommand(params);
    await lambda.send(command);
}

async function invokeCalculateRunningTotal(householdId, paymentSourceId) {
    const params = {
        FunctionName: 'calculateRunningTotal', 
        Payload: JSON.stringify({
            householdId: householdId,
            paymentSourceId: paymentSourceId
        }),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    try {
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));

        console.log('calculateRunningTotal response:', JSON.stringify(payload, null, 2)); // Log the response

        if (payload.statusCode !== 200) {
            throw new Error(`Error invoking calculateRunningTotal: ${payload.message || 'unknown error'}`);
        }

        return payload.message;
    } catch (error) {
        console.error('Error parsing calculateRunningTotal response:', error);
        throw new Error(`Error invoking calculateRunningTotal: ${error.message}`);
    }
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const { authToken, householdId, billData } = JSON.parse(event.body);

    // Verify required fields
    const requiredFields = ['category', 'billName', 'amount', 'dayOfMonth', 'frequency', 'description'];
    for (const field of requiredFields) {
        if (!billData[field]) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: `Missing required field: ${field}` }),
            };
        }
    }

    // Verify the token
    const payload = await verifyToken(authToken);
    if (!payload.user_id) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid authorization token' }),
        };
    }

    const userUuid = payload.user_id;

    try {
        // Verify paymentSourceId exists for the household if provided
        if (billData.paymentSourceId) {
            const paymentSource = await prisma.paymentSource.findUnique({
                where: {
                    sourceId: billData.paymentSourceId,
                    householdId: householdId,
                },
            });

            if (!paymentSource) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Invalid paymentSourceId' }),
                };
            }
        }

        // Create the new bill
        const newBill = await prisma.bill.create({
            data: {
                householdId: householdId,
                category: billData.category,
                billName: billData.billName,
                amount: billData.amount,
                dayOfMonth: billData.dayOfMonth,
                frequency: billData.frequency,
                description: billData.description,
                status: false,
                url: billData.url,
                username: billData.username,
                password: billData.password,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        // Generate ledger entries based on the frequency
        const startDate = new Date();
        startDate.setDate(billData.dayOfMonth);
        const futureDates = calculateFutureDates(startDate, billData.frequency);

        const tags = `${billData.billName},${billData.category}`;

        const ledgerEntries = futureDates.map(date => ({
            householdId: householdId,
            paymentSourceId: billData.paymentSourceId, // Get paymentSourceId from billData
            amount: billData.amount,
            transactionType: 'Debit',
            transactionDate: date,
            category: billData.category,
            description: billData.description,
            status: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            billId: newBill.id, // Assuming billId is correctly referenced
            isInitial: false,
            runningTotal: 0.0,
            tags: tags // Add tags with bill's name and category
        }));

        await prisma.ledger.createMany({ data: ledgerEntries });

        // Create notifications for each ledger entry
        for (const entry of ledgerEntries) {
            await createNotification(entry, userUuid);
        }

        // Invoke calculateRunningTotal Lambda function
        await invokeCalculateRunningTotal(householdId, billData.paymentSourceId);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ 
                message: 'Bill and ledger entries created successfully.',
                bill: newBill
            }),
        };
    } catch (error) {
        console.error('Error adding bill:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    } finally {
        await prisma.$disconnect();
    }
}
