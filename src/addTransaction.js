const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { S3Client, PutObjectCommand, HeadBucketCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const fs = require("fs");
const path = require("path");
const os = require("os");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const BUCKET = process.env.BUCKET;

const uploadToS3 = async (bucket, key, buffer, mimeType) => {
  try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
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

      const { ContentLength } = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      console.log(`File size in S3: ${ContentLength} bytes`);
  } catch (err) {
      throw new Error(`Error uploading to S3: ${err.message}`);
  }
};

exports.handler = async (event) => {
    const result = {
        fields: {},
        files: [],
    };

    try {
        const body = JSON.parse(event.body);
        const { authorizationToken, householdId, amount, transactionType, transactionDate, category, description, ipAddress, deviceDetails, status, sourceId, tags, image } = body;

        if (!authorizationToken) {
            return { statusCode: 401, body: JSON.stringify({ message: 'Access denied. No token provided.' }) };
        }

        const verifyTokenCommand = new InvokeCommand({ FunctionName: 'verifyToken', Payload: JSON.stringify({ authorizationToken }) });
        const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
        const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

        if (verifyTokenResponse.FunctionError) {
            throw new Error(payload.errorMessage || 'Token verification failed.');
        }

        const updatedBy = payload.username;
        if (!updatedBy) throw new Error('Token verification did not return a valid username.');

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
                amount: parseFloat(amount),
                transactionType,
                transactionDate: new Date(transactionDate),
                category,
                description,
                createdAt: new Date(),
                updatedAt: new Date(),
                updatedBy,
                runningTotal: transactionType.toLowerCase() === 'debit' ? runningTotal - parseFloat(amount) : runningTotal + parseFloat(amount),
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
                amount: parseFloat(amount),
                transactionDate: new Date(transactionDate),
                description,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        await prisma.auditTrail.create({
            data: {
                auditId: uuidv4(),
                tableAffected: 'Ledger',
                actionType: 'Create',
                oldValue: '',
                newValue: JSON.stringify(newLedger),
                changedBy: updatedBy,
                changeDate: new Date(),
                timestamp: new Date(),
                device: deviceDetails,
                ipAddress,
                deviceType: '',
                ssoEnabled: 'false',
            },
        });

        return { statusCode: 201, body: JSON.stringify({ message: "Transaction added successfully", transaction: newTransaction }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: "Error processing request", error: error.message }) };
    } finally {
        await prisma.$disconnect();
    }
};

async function getRunningTotal(householdId, paymentSourceId) {
    const transactions = await prisma.ledger.findMany({
        where: { householdId, paymentSourceId },
    });

    return transactions.reduce((total, transaction) => {
        return transaction.transactionType.toLowerCase() === 'debit' ? total - transaction.amount : total + transaction.amount;
    }, 0);
}
