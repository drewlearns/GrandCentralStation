const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { S3Client, PutObjectCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { Buffer } = require("buffer");
const Decimal = require("decimal.js");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

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

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, transactionId, householdId, amount, transactionType, transactionDate, category, description, ipAddress, deviceDetails, status, sourceId, tags, image } = body;

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

    const transactionExists = await prisma.transaction.findUnique({ where: { transactionId } });
    if (!transactionExists) return { statusCode: 404, body: JSON.stringify({ message: "Transaction not found" }) };

    const householdExists = await prisma.household.findUnique({ where: { householdId } });
    if (!householdExists) return { statusCode: 404, body: JSON.stringify({ message: "Household not found" }) };

    const paymentSourceExists = await prisma.paymentSource.findUnique({ where: { sourceId } });
    if (!paymentSourceExists) return { statusCode: 404, body: JSON.stringify({ message: "Payment source not found" }) };

    let filePath = null;
    if (image) {
      const imageKey = `transaction-images/${uuidv4()}.jpg`;
      await uploadToS3(BUCKET, imageKey, image);

      const existingAttachment = await prisma.attachment.findFirst({ where: { ledgerId: transactionExists.ledgerId } });
      if (existingAttachment) {
        await deleteFromS3(BUCKET, existingAttachment.filePath);
        await prisma.attachment.update({
          where: { attachmentId: existingAttachment.attachmentId },
          data: { filePath: imageKey, updatedAt: new Date() }
        });
      } else {
        await prisma.attachment.create({
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
        updatedBy,
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
      await prisma.attachment.upsert({
        where: {
          ledgerId_fileType: {
            ledgerId: updatedLedger.ledgerId,
            fileType: "receipt"
          }
        },
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

    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Ledger',
        actionType: 'Update',
        oldValue: JSON.stringify(transactionExists),
        newValue: JSON.stringify(updatedLedger),
        changedBy: updatedBy,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    return { statusCode: 200, body: JSON.stringify({ message: "Transaction updated successfully", transaction: updatedTransaction }) };
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
    return transaction.transactionType.toLowerCase() === 'debit' ? new Decimal(total).minus(new Decimal(transaction.amount)).toFixed(2) : new Decimal(total).plus(new Decimal(transaction.amount)).toFixed(2);
  }, new Decimal(0));
}
