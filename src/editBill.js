const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');
const Decimal = require('decimal.js');
const { format, fromUnixTime } = require('date-fns'); // Import date-fns functions

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

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
        Payload: JSON.stringify({ householdId, paymentSourceId }),
    };

    const command = new InvokeCommand(params);
    try {
        const response = await lambda.send(command);
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));

        if (payload.statusCode !== 200) {
            throw new Error(`Error invoking calculateRunningTotal: ${payload.message || 'unknown error'}`);
        }

        return payload.message;
    } catch (error) {
        console.error('Error invoking calculateRunningTotal:', error);
        throw new Error(`Error invoking calculateRunningTotal: ${error.message}`);
    }
}

async function storeCredentialsInSecretsManager(billId, username, password) {
    const secretName = `bill-credentials/${billId}`;
    const secretValue = JSON.stringify({ username, password });

    try {
        const command = new CreateSecretCommand({
            Name: secretName,
            SecretString: secretValue,
        });

        const response = await secretsManagerClient.send(command);
        return response.ARN;
    } catch (error) {
        if (error.name === 'ResourceExistsException') {
            const command = new UpdateSecretCommand({
                SecretId: secretName,
                SecretString: secretValue,
            });

            const response = await secretsManagerClient.send(command);
            return response.ARN;
        } else {
            console.error('Error storing credentials in Secrets Manager:', error);
            throw error;
        }
    }
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const body = JSON.parse(event.body);
    const { householdId, amount, startDate, endDate, category, description, sourceId, tags, billId, url, username, password, frequency } = body;

    try {
        // Validate required fields
        if (!startDate || (frequency !== 'once' && !endDate)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing required fields: startDate is required. endDate is required unless frequency is "once".' }),
            };
        }

        // Convert epoch times to desired format
        let parsedStartDate = format(fromUnixTime(startDate / 1000), 'yyyy-MM-dd HH:mm:ss.SSS');
        let parsedEndDate = endDate ? format(fromUnixTime(endDate / 1000), 'yyyy-MM-dd HH:mm:ss.SSS') : null;

        const startDateObj = new Date(parsedStartDate);
        const endDateObj = parsedEndDate ? new Date(parsedEndDate) : null;

        if (isNaN(startDateObj.getTime()) || (endDate && isNaN(endDateObj.getTime()))) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid date format for startDate or endDate.' }),
            };
        }

        // Update the Bill table
        const updatedBill = await prisma.bill.update({
            where: { billId },
            data: {
                category,
                amount: new Decimal(amount).toFixed(2),
                startDate: startDateObj,
                endDate: endDateObj,
                frequency,
                description,
                status: false, // status will always be false
                url,
                updatedAt: new Date()
            },
        });

        // Store credentials in Secrets Manager and update the bill with the ARN
        if (username && password) {
            const credentialsArn = await storeCredentialsInSecretsManager(billId, username, password);
            await prisma.bill.update({
                where: { billId },
                data: {
                    username: credentialsArn,
                    password: credentialsArn,
                },
            });
        }

        // Get all ledger entries associated with the BillId
        const ledgerEntries = await prisma.ledger.findMany({
            where: { billId }
        });

        // Calculate future dates based on the new frequency and start date
        const futureDates = calculateFutureDates(startDateObj, endDateObj, frequency);

        // Update the ledger entries based on the new frequency and dates
        for (let i = 0; i < ledgerEntries.length; i++) {
            if (futureDates[i]) {
                await prisma.ledger.update({
                    where: { ledgerId: ledgerEntries[i].ledgerId },
                    data: {
                        transactionDate: futureDates[i],
                        updatedAt: new Date()
                    }
                });
            }
        }

        // Invoke calculateRunningTotal Lambda function
        console.log('Invoking calculateRunningTotal with:', { householdId, paymentSourceId: sourceId });
        await invokeCalculateRunningTotal(householdId, sourceId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Bill and associated ledger entries updated successfully", bill: updatedBill })
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Error processing request", error: error.message })
        };
    } finally {
        await prisma.$disconnect();
    }
};
