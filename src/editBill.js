const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { S3Client, PutObjectCommand, HeadBucketCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const Decimal = require("decimal.js");
const { Buffer } = require("buffer");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,PUT'
};

const BUCKET = process.env.BUCKET;

const uploadToS3 = async (bucket, key, base64String) => {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    throw new Error(`Bucket ${bucket} does not exist or you have no access.`);
  }

  const buffer = Buffer.from(base64String, 'base64');

  const params = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
  } catch (err) {
    throw new Error(`Error uploading to S3: ${err.message}`);
  }
};

const deleteFromS3 = async (bucket, key) => {
  const params = {
    Bucket: bucket,
    Key: key
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (err) {
    throw new Error(`Error deleting from S3: ${err.message}`);
  }
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambdaClient.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload.isValid;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, transactionId, householdId, amount, transactionType, transactionDate, category, description, status, sourceId, tags, image } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Access denied. No token provided.' })
      };
    }

    // Verify the token
    const isValid = await verifyToken(authorizationToken);
    if (!isValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid authorization token' }),
      };
    }

    const transactionExists = await prisma.transaction.findUnique({ where: { transactionId } });
    if (!transactionExists) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Transaction not found" }) };

    const householdExists = await prisma.household.findUnique({ where: { householdId } });
    if (!householdExists) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Household not found" }) };

    const paymentSourceExists = await prisma.paymentSource.findUnique({ where: { sourceId } });
    if (!paymentSourceExists) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Payment source not found" }) };

    let filePath = null;
    if (image) {
      const imageKey = `transaction-images/${uuidv4()}.jpg`;
      await uploadToS3(BUCKET, imageKey, image);

      const existingAttachment = await prisma.attachments.findFirst({ where: { ledgerId: transactionExists.ledgerId, fileType: "receipt" } });
      if (existingAttachment) {
        await deleteFromS3(BUCKET, existingAttachment.filePath);
        await prisma.attachments.update({
          where: { attachmentId: existingAttachment.attachmentId },
          data: { filePath: imageKey, updatedAt: new Date() }
        });
      } else {
        await prisma.attachments.create({
          data: {
            attachmentId: uuidv4(),
            ledgerId: transactionExists.ledgerId,
            fileType: "receipt",
            filePath: imageKey,
            uploadDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      filePath = imageKey;
    }

    const runningTotal = await getRunningTotal(householdId, sourceId);

    const updatedLedger = await prisma.ledger.update({
      where: { ledgerId: transactionExists.ledgerId },
      data: {
        householdId,
        paymentSourceId: sourceId,
        amount: parseFloat(new Decimal(amount).toFixed(2)),
        transactionType,
        transactionDate: new Date(transactionDate),
        category,
        description,
        updatedAt: new Date(),
        runningTotal: parseFloat(transactionType.toLowerCase() === 'debit' ? new Decimal(runningTotal).minus(new Decimal(amount)).toFixed(2) : new Decimal(runningTotal).plus(new Decimal(amount)).toFixed(2)),
        status: status === "true",
        tags: tags || null,
      },
    });

    const updatedTransaction = await prisma.transaction.update({
      where: { transactionId },
      data: {
        ledgerId: updatedLedger.ledgerId,
        sourceId,
        amount: parseFloat(new Decimal(amount).toFixed(2)),
        transactionDate: new Date(transactionDate),
        description,
        updatedAt: new Date(),
      },
    });

    if (filePath) {
      await prisma.attachments.upsert({
        where: { attachmentId: uuidv4() },
        update: {
          filePath: filePath,
          updatedAt: new Date()
        },
        create: {
          attachmentId: uuidv4(),
          ledgerId: updatedLedger.ledgerId,
          fileType: "receipt",
          filePath: filePath,
          uploadDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    const calculateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: householdId, paymentSourceId: sourceId }),
    });

    await lambdaClient.send(calculateTotalsCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Transaction updated successfully", transaction: updatedTransaction })
    };
  } catch (error) {
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
    if (transaction.amount === null) {
      return total;
    }
    return transaction.transactionType.toLowerCase() === 'debit' ? 
      new Decimal(total).minus(new Decimal(transaction.amount)).toFixed(2) : 
      new Decimal(total).plus(new Decimal(transaction.amount)).toFixed(2);
  }, new Decimal(0));
}
