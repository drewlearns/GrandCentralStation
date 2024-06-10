const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, householdId, reportType, category } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

  if (!householdId || !reportType) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Missing householdId or reportType parameter" }),
    };
  }

  const s3Bucket = process.env.BUCKET;
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
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    let ledgerEntries;
    if (reportType === 'yearEnd') {
      ledgerEntries = await prisma.ledger.groupBy({
        by: ['subcategory'],
        where: { householdId, category },
        _sum: { amount: true },
      });
    } else if (reportType === 'tracking') {
      ledgerEntries = await prisma.ledger.findMany({
        where: { householdId, category },
        select: {
          amount: true,
          transactionType: true,
          transactionDate: true,
          category: true,
          subcategory: true,
          description: true,
          status: true,
        },
      });
    }

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No ledger entries found for the specified criteria" }),
      };
    }

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(ledgerEntries);

    const s3Params = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: csv,
      ContentType: "text/csv"
    };

    const putObjectCommand = new PutObjectCommand(s3Params);
    await s3Client.send(putObjectCommand);

    const getObjectCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key });
    const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CSV export successful", presignedUrl: presignedUrl }),
    };
  } catch (error) {
    console.error('Error exporting ledger to CSV:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error exporting ledger to CSV", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
