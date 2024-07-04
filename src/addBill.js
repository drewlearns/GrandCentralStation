const { Decimal } = require('decimal.js');
const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SecretsManagerClient, CreateSecretCommand } = require('@aws-sdk/client-secrets-manager');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken',
        Payload: JSON.stringify({ authToken: token }),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    if (result.errorMessage) {
        throw new Error(result.errorMessage);
    }

    const payload = JSON.parse(result.body);

    return payload;
}

async function validateUser(userId, householdId) {
    const user = await prisma.user.findUnique({
        where: { uuid: userId },
    });

    if (!user) {
        return false;
    }

    const householdMembers = await prisma.householdMembers.findMany({
        where: { householdId },
        select: { memberUuid: true },
    });

    const memberUuids = householdMembers.map(member => member.memberUuid);
    return memberUuids.includes(userId);
}

function calculateFutureDates(startDate, endDate, frequency) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (frequency !== 'once' && currentDate <= new Date(endDate)) {
        dates.push(new Date(currentDate));

        switch (frequency) {
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

    if (frequency === 'once') {
        dates.push(new Date(startDate));
    }

    return dates;
}

async function createNotification(ledgerEntry, userUuid) {
    console.log('Creating notification for ledger entry:', ledgerEntry);

    const params = {
        FunctionName: 'addNotification',
        Payload: JSON.stringify({
            userUuid,
            billId: ledgerEntry.billId,
            title: `Upcoming bill: ${ledgerEntry.category}`,
            message: `Your bill ${ledgerEntry.description} is due on ${ledgerEntry.transactionDate.toDateString()}`,
            dueDate: ledgerEntry.transactionDate.toISOString()
        }),
    };

    console.log('Notification Payload:', params.Payload);

    const command = new InvokeCommand(params);
    await lambda.send(command);
}

async function invokeCalculateRunningTotal(householdId, paymentSourceId) {
    const params = {
        FunctionName: 'calculateRunningTotal',
        Payload: JSON.stringify({ householdId, paymentSourceId }),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    try {
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));

        if (payload.statusCode !== 200) {
            throw new Error(`Error invoking calculateRunningTotal: ${payload.message || 'unknown error'}`);
        }

        return payload.message;
    } catch (error) {
        throw new Error(`Error invoking calculateRunningTotal: ${error.message}`);
    }
}

async function storeCredentialsInSecretsManager(billId, username, password) {
    const secretName = `bill-credentials/${billId}`;
    const secretValue = JSON.stringify({ username, password });

    const command = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
    });

    const response = await secretsManagerClient.send(command);
    return response.ARN;
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
    const requiredFields = ['category', 'billName', 'amount', 'startDate', 'frequency', 'description'];
    for (const field of requiredFields) {
        if (!billData[field]) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: `Missing required field: ${field}` }),
            };
        }
    }

    // End date is required only if frequency is not 'once'
    if (billData.frequency !== 'once' && !billData.endDate) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Missing required field: endDate' }),
        };
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
        const isValidUser = await validateUser(userUuid, householdId);
        if (!isValidUser) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid user or household association.' }),
            };
        }

        // Verify paymentSourceId exists for the household if provided
        if (billData.paymentSourceId) {
            const paymentSource = await prisma.paymentSource.findUnique({
                where: {
                    sourceId: billData.paymentSourceId,
                    householdId,
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

        // Create the new bill to get the billId
        const newBill = await prisma.bill.create({
            data: {
                householdId,
                category: billData.category,
                billName: billData.billName,
                amount: billData.amount,
                startDate: new Date(billData.startDate),
                endDate: billData.frequency !== 'once' ? new Date(billData.endDate) : null,
                frequency: billData.frequency,
                description: billData.description,
                status: false,
                url: billData.url,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        // Store credentials in Secrets Manager if provided and update the bill with the ARN
        if (billData.username && billData.password) {
            const credentialsArn = await storeCredentialsInSecretsManager(newBill.billId, billData.username, billData.password);
            await prisma.bill.update({
                where: { billId: newBill.billId },
                data: {
                    username: credentialsArn,
                    password: credentialsArn,
                },
            });
        }

        // Generate ledger entries based on the frequency
        const futureDates = calculateFutureDates(new Date(billData.startDate), billData.frequency !== 'once' ? new Date(billData.endDate) : null, billData.frequency);

        const tags = `${billData.billName},${billData.category}`;

        const ledgerEntries = futureDates.map(date => ({
            householdId,
            paymentSourceId: billData.paymentSourceId,
            amount: billData.amount,
            transactionType: 'Debit',
            transactionDate: date,
            category: billData.category,
            description: `${billData.billName} | ${billData.description}`,
            status: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            billId: newBill.billId,
            isInitial: false,
            runningTotal: 0.0,
            tags,
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
};
