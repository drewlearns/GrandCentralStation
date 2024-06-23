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
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload.isValid;
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

async function createNotification(ledgerEntry) {
    const params = {
        FunctionName: 'addNotification', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({
            userUuid: ledgerEntry.householdId, // Adjust as necessary
            billId: ledgerEntry.billId,
            title: `Upcoming bill: ${ledgerEntry.category}`,
            message: `Your bill ${ledgerEntry.category} is due on ${ledgerEntry.transactionDate.toDateString()}`,
            dueDate: ledgerEntry.transactionDate
        })),
    };

    const command = new InvokeCommand(params);
    await lambda.send(command);
}

async function invokeCalculateRunningTotal(householdId) {
    const params = {
        FunctionName: 'calculateRunningTotal', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({
            householdId: householdId,
            paymentSourceId: null // Adjust based on your actual payment source logic
        })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.statusCode !== 200) {
        throw new Error(`Error invoking calculateRunningTotal: ${payload.message}`);
    }

    return payload.message;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const { authToken, householdId, billData } = JSON.parse(event.body);

    // Verify the token
    const isValid = await verifyToken(authToken);
    if (!isValid) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid authorization token' }),
        };
    }

    try {
        // Create the new bill
        const newBill = await prisma.bill.create({
            data: {
                householdId: householdId,
                category: billData.category,
                billName: billData.billName,
                amount: new Decimal(billData.amount).toFixed(2),
                dayOfMonth: billData.dayOfMonth,
                frequency: billData.frequency,
                isDebt: billData.isDebt,
                description: billData.description,
                status: billData.status,
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

        const ledgerEntries = futureDates.map(date => ({
            householdId: householdId,
            paymentSourceId: null, // assuming no payment source initially
            amount: new Decimal(billData.amount).toFixed(2),
            transactionType: 'bill',
            transactionDate: date,
            category: billData.category,
            description: billData.description,
            status: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            billId: newBill.billId,
            isInitial: false
        }));

        await prisma.ledger.createMany({ data: ledgerEntries });

        // Create notifications for each ledger entry
        for (const entry of ledgerEntries) {
            await createNotification(entry);
        }

        // Invoke calculateRunningTotal Lambda function
        await invokeCalculateRunningTotal(householdId);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(newBill),
        };
    } catch (error) {
        console.error('Error adding bill:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
}

// Example usage:
// const authToken = 'your-auth-token';
// const householdId = 'your-household-id';
// const billData = {
//     category: 'Utilities',
//     billName: 'Electricity Bill',
//     amount: 100.50,
//     dayOfMonth: 15,
//     frequency: 'monthly',
//     isDebt: false,
//     description: 'Monthly electricity bill',
//     status: false,
//     url: 'http://example.com',
//     username: 'user',
//     password: 'pass',
// };

// addBill(authToken, householdId, billData)
//     .then(newBill => console.log('New bill added:', newBill))
//     .catch(error => console.error('Error adding bill:', error));
