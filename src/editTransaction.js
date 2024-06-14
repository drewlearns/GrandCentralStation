const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { S3Client, PutObjectCommand, HeadBucketCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { Buffer } = require("buffer");
const Decimal = require("decimal.js");

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

const uploadToS3 = async (bucket, key, base64String) => {
  console.log(`Attempting to upload to bucket ${bucket} with key ${key}`);
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    console.error(`Bucket ${bucket} does not exist or you have no access.`, err);
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
    console.log(`Successfully uploaded to S3 with key ${key}`);
  } catch (err) {
    console.error(`Error uploading to S3: ${err.message}`, err);
    throw new Error(`Error uploading to S3: ${err.message}`);
  }
};

const deleteFromS3 = async (bucket, key) => {
  console.log(`Attempting to delete from bucket ${bucket} with key ${key}`);
  const params = {
    Bucket: bucket,
    Key: key
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`Successfully deleted from S3 with key ${key}`);
  } catch (err) {
    console.error(`Error deleting from S3: ${err.message}`, err);
    throw new Error(`Error deleting from S3: ${err.message}`);
  }
};

exports.handler = async (event) => {
  console.log('Event received:', event);
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, transactionId, householdId, amount, transactionType, transactionDate, category, description, status, sourceId, tags, image } = body;

    if (!authorizationToken) {
      console.warn('No authorization token provided');
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Access denied. No token provided.' })
      };
    }

    console.log('Invoking verifyToken function');
    const verifyTokenCommand = new InvokeCommand({ FunctionName: 'verifyToken', Payload: JSON.stringify({ authorizationToken }) });
    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

    if (verifyTokenResponse.FunctionError) {
      console.error('Token verification failed:', payload);
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    const updatedBy = payload.username;
    if (!updatedBy) throw new Error('Token verification did not return a valid username.');

    console.log('Checking if transaction exists');
    const transactionExists = await prisma.transaction.findUnique({ where: { transactionId } });
    if (!transactionExists) return { statusCode: 404, body: JSON.stringify({ message: "Transaction not found" }) };

    console.log('Checking if household exists');
    const householdExists = await prisma.household.findUnique({ where: { householdId } });
    if (!householdExists) return { statusCode: 404, body: JSON.stringify({ message: "Household not found" }) };

    console.log('Checking if payment source exists');
    const paymentSourceExists = await prisma.paymentSource.findUnique({ where: { sourceId } });
    if (!paymentSourceExists) return { statusCode: 404, body: JSON.stringify({ message: "Payment source not found" }) };

    if (!prisma.attachments) {
      console.error('Prisma attachments model is undefined. Please check your Prisma schema and ensure the model is defined correctly.');
      throw new Error('Internal server error');
    }

    let filePath = null;
    let existingAttachment = null;
    if (image) {
      console.log('Uploading image to S3');
      const imageKey = `transaction-images/${uuidv4()}.jpg`;
      await uploadToS3(BUCKET, imageKey, image);

      existingAttachment = await prisma.attachments.findFirst({ where: { ledgerId: transactionExists.ledgerId, fileType: "receipt" } });
      if (existingAttachment) {
        console.log('Deleting existing attachment from S3');
        await deleteFromS3(BUCKET, existingAttachment.filePath);
        await prisma.attachments.update({
          where: { attachmentId: existingAttachment.attachmentId },
          data: { filePath: imageKey, updatedAt: new Date() }
        });
      } else {
        console.log('Creating new attachment in database');
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

    console.log('Calculating running total');
    const runningTotal = await getRunningTotal(householdId, sourceId);

    console.log('Updating ledger');
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
        updatedBy,
        runningTotal: parseFloat(transactionType.toLowerCase() === 'debit' ? new Decimal(runningTotal).minus(new Decimal(amount)).toFixed(2) : new Decimal(runningTotal).plus(new Decimal(amount)).toFixed(2)),
        status: status === "true",
        tags: tags || null,
      },
    });

    console.log('Updating transaction');
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
      console.log('Upserting attachment');
      await prisma.attachments.upsert({
        where: { attachmentId: existingAttachment ? existingAttachment.attachmentId : uuidv4() },
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

    console.log('Invoking calculateRunningTotal function');
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
  console.log(`Calculating running total for householdId ${householdId} and paymentSourceId ${paymentSourceId}`);
  const transactions = await prisma.ledger.findMany({
    where: { householdId, paymentSourceId },
  });

  return transactions.reduce((total, transaction) => {
    if (transaction.amount === null) {
      console.warn(`Transaction with id ${transaction.ledgerId} has a null amount. Skipping.`);
      return total;
    }
    return transaction.transactionType.toLowerCase() === 'debit' ? 
      new Decimal(total).minus(new Decimal(transaction.amount)).toFixed(2) : 
      new Decimal(total).plus(new Decimal(transaction.amount)).toFixed(2);
  }, new Decimal(0));
}
