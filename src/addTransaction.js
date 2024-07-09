const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand, HeadBucketCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const Decimal = require('decimal.js');
const { format, fromUnixTime } = require('date-fns'); // Import date-fns functions

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const BUCKET = process.env.BUCKET;

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken',
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    const nestedPayload = JSON.parse(payload.body);

    return nestedPayload;
}

async function uploadToS3(bucket, key, buffer, mimeType) {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (err) {
        console.error(`Bucket ${bucket} does not exist or you have no access.`, err);
        throw new Error(`Bucket ${bucket} does not exist or you have no access.`);
    }

    const params = {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
    };

    try {
        await s3Client.send(new PutObjectCommand(params));
        await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch (err) {
        console.error(`Error uploading to S3: ${err.message}`, err);
        throw new Error(`Error uploading to S3: ${err.message}`);
    }
}

async function getRunningTotal(householdId, paymentSourceId) {
    const transactions = await prisma.ledger.findMany({
        where: { householdId, paymentSourceId },
    });

    return transactions.reduce((total, transaction) => {
        return transaction.transactionType.toLowerCase() === 'debit'
            ? new Decimal(total).minus(new Decimal(transaction.amount)).toFixed(2)
            : new Decimal(total).plus(new Decimal(transaction.amount)).toFixed(2);
    }, new Decimal(0));
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { authToken, householdId, amount, transactionType, transactionDate, category, description, status, sourceId, tags, image } = body;

        // Validate required fields
        if (!authToken) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Access denied. No token provided.' })
            };
        }

        if (!sourceId || !transactionDate || !transactionType || !amount || !description) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Missing required fields: sourceId, transactionDate, transactionType, amount, and description are required.' })
            };
        }

        // Verify the token
        const payload = await verifyToken(authToken);
        const userId = payload.user_id;
        if (!userId) {
            throw new Error('Invalid authorization token');
        }

        const householdExists = await prisma.household.findUnique({ where: { householdId } });
        if (!householdExists) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Household not found' })
            };
        }

        const paymentSourceExists = await prisma.paymentSource.findUnique({ where: { sourceId } });
        if (!paymentSourceExists) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Payment source not found' })
            };
        }

        let filePath = null;
        if (image) {
            const buffer = Buffer.from(image, 'base64');
            const imageKey = `transaction-images/${uuidv4()}.jpg`;
            await uploadToS3(BUCKET, imageKey, buffer, 'image/jpeg');
            filePath = imageKey;
        }

        const runningTotal = await getRunningTotal(householdId, sourceId);

        // Convert epoch time to desired format
        const parsedTransactionDate = format(fromUnixTime(transactionDate / 1000), 'yyyy-MM-dd HH:mm:ss.SSS');

        const newLedger = await prisma.ledger.create({
            data: {
                ledgerId: uuidv4(),
                householdId,
                paymentSourceId: sourceId,
                amount: amount,
                transactionType,
                transactionDate: new Date(parsedTransactionDate),
                category,
                description,
                createdAt: new Date(),
                updatedAt: new Date(),
                runningTotal: parseFloat(transactionType.toLowerCase() === 'debit' ? new Decimal(runningTotal).minus(new Decimal(amount)).toFixed(2) : new Decimal(runningTotal).plus(new Decimal(amount)).toFixed(2)),
                attachments: image ? { create: { attachmentId: uuidv4(), fileType: "receipt", filePath, uploadDate: new Date(), createdAt: new Date(), updatedAt: new Date() } } : undefined,
                status,
                tags: tags || "",
            },
        });

        const newTransaction = await prisma.transaction.create({
            data: {
                transactionId: uuidv4(),
                ledgerId: newLedger.ledgerId,
                sourceId,
                amount: amount,
                transactionDate: new Date(parsedTransactionDate),
                description,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Invoke calculateRunningTotal Lambda function
        const updateTotalsCommand = new InvokeCommand({
            FunctionName: 'calculateRunningTotal',
            Payload: new TextEncoder().encode(JSON.stringify({ householdId, paymentSourceId: sourceId })),
        });

        await lambda.send(updateTotalsCommand);

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Transaction added successfully', transaction: newTransaction })
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Error processing request', message: error.message })
        };
    } finally {
        await prisma.$disconnect();
    }
};
