const { PrismaClient, Decimal } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { v4: uuidv4 } = require('uuid');
const { format, fromUnixTime } = require('date-fns'); // Import date-fns functions

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

function calculateFutureDates(startDate, endDate, frequency) {
    const dates = [];
    let currentDate = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const incrementMap = {
        once: () => currentDate,
        weekly: () => currentDate.setDate(currentDate.getDate() + 7),
        biweekly: () => currentDate.setDate(currentDate.getDate() + 14),
        monthly: () => currentDate.setMonth(currentDate.getMonth() + 1),
        bimonthly: () => currentDate.setMonth(currentDate.getMonth() + 2),
        quarterly: () => currentDate.setMonth(currentDate.getMonth() + 3),
        semiAnnually: () => currentDate.setMonth(currentDate.getMonth() + 6),
        annually: () => currentDate.setFullYear(currentDate.getFullYear() + 1),
        semiMonthly: () => {
            const nextMonth = new Date(currentDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            if (currentDate.getDate() === 1) {
                currentDate.setDate(15);
            } else if (currentDate.getDate() === 15) {
                currentDate.setDate(1);
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else {
                currentDate.setDate(currentDate.getDate() <= 15 ? 15 : 1);
                if (currentDate.getDate() === 1) {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
            }

            // Ensure the date is not beyond the end date
            if (end && currentDate > end) return false;
            return true;
        },
    };

    while (!end || currentDate <= end) {
        dates.push(new Date(currentDate));
        if (frequency === 'semiMonthly' && !incrementMap[frequency]()) break;
        else incrementMap[frequency]();
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
        const { name, amount, frequency, startDate, endDate } = incomeData;
        
        if (!name || amount === undefined || !frequency || !startDate) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing required incomeData fields: name, amount, frequency, startDate are required.' }),
            };
        }

        console.log(`name: ${name}`);
        console.log(`amount: ${amount}`);
        console.log(`frequency: ${frequency}`);
        console.log(`startDate: ${startDate}`);
        console.log(`endDate: ${endDate}`);

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

        const incomeId = uuidv4();

        // Convert epoch times to desired format
        let parsedStartDate = format(fromUnixTime(startDate / 1000), 'yyyy-MM-dd HH:mm:ss.SSS');
        let parsedEndDate = endDate ? format(fromUnixTime(endDate / 1000), 'yyyy-MM-dd HH:mm:ss.SSS') : parsedStartDate;

        console.log(`Parsed startDate: ${parsedStartDate}`);
        console.log(`Parsed endDate: ${parsedEndDate}`);

        const newIncome = await prisma.incomes.create({
            data: {
                incomeId, // Use the generated UUID for incomeId
                householdId,
                name: name,
                amount: new Decimal(amount), // Ensure the amount is correctly converted to Decimal
                frequency: frequency,
                startDate: new Date(parsedStartDate),
                endDate: new Date(parsedEndDate), // Use the validated endDate or startDate if null
                createdAt: new Date(),
                updatedAt: new Date(),
                firstPayDay: new Date(parsedStartDate), // Added firstPayDay
            }
        });

        const futureDates = calculateFutureDates(new Date(parsedStartDate), new Date(parsedEndDate), frequency);

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
            incomeId: incomeId, // Ensure incomeId is correctly referenced
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
