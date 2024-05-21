const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, householdId, paymentSourceId, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!householdId || !paymentSourceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing householdId or paymentSourceId parameter" }),
    };
  }

  const s3Bucket = process.env.S3_BUCKET_NAME;
  const s3Key = `ledger-exports/${uuidv4()}.csv`;

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: 'verifyToken',
      Payload: JSON.stringify({ authorizationToken })
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));

    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || 'Token verification failed.');
    }

    username = payload.username;
    if (!username) {
      throw new Error('Token verification did not return a valid username.');
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        householdId: householdId,
        paymentSourceId: paymentSourceId
      },
      select: {
        amount: true,
        transactionType: true,
        transactionDate: true,
        category: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        updatedBy: true,
        runningTotal: true,
        interestRate: true,
        cashBack: true,
        tags: true
      }
    });

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No ledger entries found for the specified payment source" }),
      };
    }

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(ledgerEntries);

    const s3Params = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: csv,
      // ContentType: "text/csv"
    };

    const putObjectCommand = new PutObjectCommand(s3Params);
    await s3Client.send(putObjectCommand);

    const getObjectCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key });
    const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });

    // Log to audit trail
    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Ledger',
        actionType: 'Export',
        oldValue: '',
        newValue: JSON.stringify({ s3Bucket, s3Key }),
        changedBy: username,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "CSV export successful", presignedUrl: presignedUrl }),
    };
  } catch (error) {
    console.error('Error exporting ledger to CSV:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error exporting ledger to CSV", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};