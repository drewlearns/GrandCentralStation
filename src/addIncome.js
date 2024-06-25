const { PrismaClient, Decimal } = require('@prisma/client');
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

async function validateUser(userId, householdId) {
    console.log('Validating user with ID:', userId);

    const user = await prisma.user.findUnique({
        where: { uuid: userId },
    });

    console.log('User found:', user);

    if (!user) {
        return false;
    }

    const householdMembers = await prisma.householdMembers.findMany({
        where: {
            householdId: householdId,
        },
        select: {
            memberUuid: true,
        },
    });

    console.log("validateUser - householdMembers:", householdMembers);

    const memberUuids = householdMembers.map(member => member.memberUuid);
    const isValidUser = memberUuids.includes(userId);

    console.log("validateUser - isValidUser:", isValidUser);

    return isValidUser;
}

function calculateFutureDates(startDate, frequency) {
    const dates = [];
    let currentDate = new Date(startDate);

    const incrementMap = {
        once: () => currentDate,
        weekly: () => currentDate.setDate(currentDate.getDate() + 7),
        biweekly: () => currentDate.setDate(currentDate.getDate() + 14),
        monthly: () => currentDate.setMonth(currentDate.getMonth() + 1),
        bimonthly: () => currentDate.setMonth(currentDate.getMonth() + 2),
        quarterly: () => currentDate.setMonth(currentDate.getMonth() + 3),
        semiAnnually: () => currentDate.setMonth(currentDate.getMonth() + 6),
        annually: () => currentDate.setFullYear(currentDate.getFullYear() + 1),
    };

    while (currentDate <= new Date(new Date().setMonth(new Date().getMonth() + 12))) {
        dates.push(new Date(currentDate));
        incrementMap[frequency]();
        if (frequency === 'once') break;
    }

    return dates;
}

async function invokeCalculateRunningTotal(householdId, paymentSourceId) {
    const params = {
        FunctionName: 'calculateRunningTotal',
        Payload: new TextEncoder().encode(JSON.stringify({
            householdId,
            paymentSourceId
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

    try {
        const { authToken, householdId, incomeData, paymentSourceId } = JSON.parse(event.body);

        // Validate required arguments
        if (!authToken || !householdId || !incomeData || !paymentSourceId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing required fields: authToken, householdId, incomeData, paymentSourceId are all required.' }),
            };
        }

        // Validate incomeData fields
        const { name, amount, frequency, firstPayDay } = incomeData;
        if (!name || !amount || !frequency || !firstPayDay) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing required incomeData fields: name, amount, frequency, firstPayDay are all required.' }),
            };
        }

        const payload = await verifyToken(authToken);
        console.log('Token payload:', payload);
        const userId = payload.user_id;

        if (!userId) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid authorization token: No user ID found in token.' }),
            };
        }

        console.log('User ID from token:', userId);

        const isValidUser = await validateUser(userId, householdId);
        if (!isValidUser) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid user or household association.' }),
            };
        }

        const newIncome = await prisma.incomes.create({
            data: {
                householdId,
                name: name,
                amount: new Decimal(amount), // Ensure the amount is correctly converted to Decimal
                frequency: frequency,
                firstPayDay: new Date(firstPayDay),
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        const futureDates = calculateFutureDates(new Date(firstPayDay), frequency);

        const ledgerEntries = futureDates.map(date => ({
            householdId,
            paymentSourceId,
            amount: new Decimal(amount), // Ensure the amount is correctly converted to Decimal
            transactionType: 'Credit',
            transactionDate: date,
            category: 'Income',
            description: name,
            status: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            incomeId: newIncome.id, // Ensure incomeId is correctly referenced
            isInitial: false,
            tags: name
        }));

        await prisma.ledger.createMany({ data: ledgerEntries });

        await invokeCalculateRunningTotal(householdId, paymentSourceId);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Income added successfully.',
                income: newIncome
            }),
        };
    } catch (error) {
        console.error('Error adding income:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
