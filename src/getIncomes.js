const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary

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

async function getIncomes(authToken, householdId) {
    // Verify the token
    const isValid = await verifyToken(authToken);
    if (!isValid) {
        throw new Error('Invalid authorization token');
    }

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const incomes = await prisma.ledger.findMany({
        where: {
            householdId,
            transactionDate: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
            type: 'income', // Assuming you have a 'type' field to differentiate between incomes and expenses
        },
        orderBy: {
            transactionDate: 'desc',
        },
        select: {
            incomeId: true,
            amount: true,
            transactionDate: true,
        },
    });

    // Format the results
    const result = incomes.map(income => ({
        incomeId: income.incomeId,
        amount: new Decimal(income.amount).toFixed(2),
        transactionDate: {
            day: income.transactionDate.getDate(),
            month: income.transactionDate.getMonth() + 1,
            year: income.transactionDate.getFullYear(),
        },
    }));

    return result;
}

exports.handler = async (event) => {
    const { authToken, householdId } = event;
    try {
        const incomes = await getIncomes(authToken, householdId);
        return {
            statusCode: 200,
            body: JSON.stringify(incomes),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
