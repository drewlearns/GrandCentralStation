const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');
const Decimal = require('decimal.js');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

function calculateFutureDates(startDate, frequency, dayOfMonth) {
    const dates = [];
    let currentDate = new Date(startDate);
    currentDate.setDate(dayOfMonth);

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
    const { householdId, amount, dayOfMonth, category, description, sourceId, tags, billId, url, username, password, frequency } = body;

    try {
        // Update the Bill table
        const updatedBill = await prisma.bill.update({
            where: { billId },
            data: {
                category,
                amount: new Decimal(amount).toFixed(2),
                dayOfMonth: parseInt(dayOfMonth),  // Ensure dayOfMonth is an integer
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

        // Function to calculate the next transaction date based on frequency and day of the month
        const startDate = new Date();
        startDate.setDate(parseInt(dayOfMonth));  // Ensure dayOfMonth is an integer
        const futureDates = calculateFutureDates(startDate, frequency, parseInt(dayOfMonth));  // Ensure dayOfMonth is an integer

        // Update the ledger entries based on the new frequency and day of the month
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
