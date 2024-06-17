const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { S3Client, PutObjectCommand, HeadBucketCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const fs = require("fs");
const Decimal = require("decimal.js");
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const BUCKET = process.env.BUCKET;

const uploadToS3 = async (bucket, key, buffer, mimeType) => {
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
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, refreshToken, householdId, amount, transactionType, transactionDate, category, description, status, sourceId, tags, image } = body;

    if (!authorizationToken || !refreshToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Access denied. No token provided.' })
      };
    }

    let updatedBy;
    let tokenValid = false;

    // First attempt to verify the token
    try {
      updatedBy = await verifyToken(authorizationToken);
      tokenValid = true;
    } catch (error) {
      console.error('Token verification failed, attempting refresh:', error.message);

      // Attempt to refresh the token and verify again
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      updatedBy = result.userId;
      authorizationToken = result.newToken; // Update authorizationToken with new token
      tokenValid = true;
    }

    if (!tokenValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.' }),
      };
    }

    const householdExists = await prisma.household.findUnique({ where: { householdId } });
    if (!householdExists) return { statusCode: 404, body: JSON.stringify({ message: "Household not found" }) };

    const paymentSourceExists = await prisma.paymentSource.findUnique({ where: { sourceId } });
    if (!paymentSourceExists) return { statusCode: 404, body: JSON.stringify({ message: "Payment source not found" }) };

    let filePath = null;
    if (image) {
      const buffer = Buffer.from(image, 'base64');
      const imageKey = `transaction-images/${uuidv4()}.jpg`;
      await uploadToS3(BUCKET, imageKey, buffer, 'image/jpeg');
      filePath = imageKey;
    }

    const runningTotal = await getRunningTotal(householdId, sourceId);

    const newLedger = await prisma.ledger.create({
      data: {
        ledgerId: uuidv4(),
        householdId,
        paymentSourceId: sourceId,
        amount: parseFloat(new Decimal(amount).toFixed(2)),
        transactionType,
        transactionDate: new Date(transactionDate),
        category,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy,
        runningTotal: parseFloat(transactionType.toLowerCase() === 'debit' ? new Decimal(runningTotal).minus(new Decimal(amount)).toFixed(2) : new Decimal(runningTotal).plus(new Decimal(amount)).toFixed(2)),
        attachments: image ? { create: { attachmentId: uuidv4(), fileType: "receipt", filePath, uploadDate: new Date(), createdAt: new Date(), updatedAt: new Date() } } : undefined,
        status: status === "true",
        tags: tags || null,
      },
    });

    const newTransaction = await prisma.transaction.create({
      data: {
        transactionId: uuidv4(),
        ledgerId: newLedger.ledgerId,
        sourceId,
        amount: parseFloat(new Decimal(amount).toFixed(2)),
        transactionDate: new Date(transactionDate),
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Invoke calculateRunningTotal Lambda function
    const updateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId, paymentSourceId: sourceId }),
    });

    await lambdaClient.send(updateTotalsCommand);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Transaction added successfully", transaction: newTransaction })
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

async function getRunningTotal(householdId, paymentSourceId) {
  const transactions = await prisma.ledger.findMany({
    where: { householdId, paymentSourceId },
  });

  return transactions.reduce((total, transaction) => {
    return transaction.transactionType.toLowerCase() === 'debit' ? new Decimal(total).minus(new Decimal(transaction.amount)).toFixed(2) : new Decimal(total).plus(new Decimal(transaction.amount)).toFixed(2);
  }, new Decimal(0));
}
