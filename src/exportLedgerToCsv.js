const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken', // Replace with your actual Lambda function name
    Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
  };

  const command = new InvokeCommand(params);
  const response = await lambdaClient.send(command);

  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  console.log("verifyToken response payload:", payload);

  if (payload.errorMessage) {
    throw new Error(payload.errorMessage);
  }

  const nestedPayload = JSON.parse(payload.body);

  console.log("verifyToken nested payload:", nestedPayload);

  return nestedPayload;
}

async function getEmailByUserId(userId) {
  console.log('Fetching email for user_id:', userId);
  const user = await prisma.user.findUnique({
    where: { uuid: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.email;
}

exports.handler = async (event) => {
  console.log('Received event:', event);
  const { authorizationToken, householdId, paymentSourceId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Access denied. No token provided.' }),
    };
  }

  if (!householdId || !paymentSourceId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Missing householdId or paymentSourceId parameter" }),
    };
  }

  const s3Bucket = process.env.BUCKET;
  const s3Key = `ledger-exports/${uuidv4()}.csv`;

  let userId;
  let email;

  try {
    const nestedPayload = await verifyToken(authorizationToken);
    userId = nestedPayload.user_id;
    console.log('Verified user_id:', userId);
    if (!userId) {
      throw new Error('User ID is undefined after token verification');
    }
    email = await getEmailByUserId(userId);
  } catch (error) {
    console.error('Token verification or email fetching failed:', error.message);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token or user not found.', error: error.message }),
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
        tags: true
      }
    });

    if (ledgerEntries.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No ledger entries found for the specified payment source" }),
      };
    }

    const json2csvParser = new Parser({
      fields: [
        'amount',
        'transactionType',
        'transactionDate',
        'category',
        'description',
        'status',
        'runningTotal',
        'tags',
        'createdAt',
        'updatedAt',
        'updatedBy'
      ]
    });
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

    const sesParams = {
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Body: {
          Text: {
            Data: `Hello,\n\nYour requested CSV export is ready. You can download it from the following link:\n\n${presignedUrl}\n\nThis link will expire in 1 hour.\n\nBest regards,\nThe Purple Piggy Bank Team`
          }
        },
        Subject: {
          Data: "Your Requested CSV Export is Ready"
        }
      },
      Source: "noreply@app.thepurplepiggybank.com"
    };

    const sendEmailCommand = new SendEmailCommand(sesParams);
    await sesClient.send(sendEmailCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CSV export successful and email sent", presignedUrl: presignedUrl }),
    };
  } catch (error) {
    console.error('Error exporting ledger to CSV and sending email:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error exporting ledger to CSV and sending email", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
