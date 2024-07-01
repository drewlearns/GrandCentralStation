const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin if needed
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log("verifyToken response payload:", payload);

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    const nestedPayload = JSON.parse(payload.body);

    console.log("verifyToken nested payload:", nestedPayload);

    return nestedPayload;
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

async function editIncome(authToken, incomeId, updatedIncomeData) {
    // Verify the token
    const user = await verifyToken(authToken);
    const uid = user.user_id;

    if (!uid) {
        throw new Error('Invalid token payload: missing user_id');
    }

    // Retrieve the existing income
    const existingIncome = await prisma.incomes.findUnique({
        where: { incomeId },
    });

    if (!existingIncome) {
        throw new Error('Income not found');
    }

    console.log('updatedIncomeData:', updatedIncomeData);

    // Validate the firstPayDay
    if (!updatedIncomeData.firstPayDay) {
        console.error('firstPayDay is missing in updatedIncomeData:', updatedIncomeData);
        throw new Error('firstPayDay is missing');
    }

    const firstPayDay = new Date(updatedIncomeData.firstPayDay);
    if (isNaN(firstPayDay.getTime())) {
        console.error('Invalid firstPayDay date:', updatedIncomeData.firstPayDay);
        throw new Error('Invalid firstPayDay date');
    }

    // Validate the paymentSourceId
    const paymentSource = await prisma.paymentSource.findUnique({
        where: { sourceId: updatedIncomeData.paymentSourceId }
    });

    if (!paymentSource) {
        console.error('Invalid paymentSourceId:', updatedIncomeData.paymentSourceId);
        throw new Error('Invalid paymentSourceId');
    }

    // Update the income
    const updatedIncome = await prisma.incomes.update({
        where: { incomeId },
        data: {
            name: updatedIncomeData.name,
            amount: new Decimal(updatedIncomeData.amount).toFixed(2),
            frequency: updatedIncomeData.frequency,
            firstPayDay: firstPayDay,
            updatedAt: new Date(),
        },
    });

    // Delete old ledger entries
    await prisma.ledger.deleteMany({
        where: { incomeId },
    });

    // Generate new ledger entries based on the new frequency
    const futureDates = calculateFutureDates(firstPayDay, updatedIncomeData.frequency);

    const ledgerEntries = futureDates.map(date => ({
        householdId: existingIncome.householdId,
        paymentSourceId: updatedIncomeData.paymentSourceId, // Use provided paymentSourceId
        amount: new Decimal(updatedIncomeData.amount).toFixed(2),
        transactionType: 'income',
        transactionDate: date,
        category: 'Income',
        description: updatedIncomeData.name,
        status: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        incomeId: incomeId,
        isInitial: false
    }));

    await prisma.ledger.createMany({ data: ledgerEntries });

    // Invoke calculateRunningTotal Lambda function
    await invokeCalculateRunningTotal(existingIncome.householdId);

    return updatedIncome;
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

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { authToken, incomeId, updatedIncomeData } = parsedBody;

    if (!authToken) {
        return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Unauthorized: No token provided' }),
        };
    }

    if (!incomeId || !updatedIncomeData) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'incomeId or updatedIncomeData is missing' }),
        };
    }

    if (!updatedIncomeData.paymentSourceId) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'paymentSourceId is missing' }),
        };
    }

    try {
        const updatedIncome = await editIncome(authToken, incomeId, updatedIncomeData);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Income updated successfully',
                income: updatedIncome,
            }),
        };
    } catch (error) {
        console.error('Error updating income:', error);

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
