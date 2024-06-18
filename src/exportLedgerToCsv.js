const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

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

exports.handler = async (event) => {
  const { authorizationToken, refreshToken, householdId, paymentSourceId } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token or refresh token provided.'
      })
    };
  }

  if (!householdId || !paymentSourceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing householdId or paymentSourceId parameter" }),
    };
  }

  const s3Bucket = process.env.BUCKET;
  const s3Key = `ledger-exports/${uuidv4()}.csv`;

  let username;
  let tokenValid = false;

  // First attempt to verify the token
  try {
    username = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed, attempting refresh:', error.message);

    // Attempt to refresh the token and verify again
    try {
      const result = await refreshAndVerifyToken(authorizationToken, refreshToken);
      username = result.userId;
      tokenValid = true;
    } catch (refreshError) {
      console.error('Token refresh and verification failed:', refreshError);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
      };
    }
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.' }),
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
        headers: corsHeaders,
        body: JSON.stringify({ message: "No ledger entries found for the specified payment source" }),
      };
    }

    // Define the fields for the CSV output
    const json2csvParser = new Parser({
      fields: [
        'amount',
        'transactionType',
        'transactionDate',
        'category',
        'description',
        'status',
        'runningTotal',
        'interestRate',
        'cashBack',
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

    // Send email with presigned URL
    const sesParams = {
      Destination: {
        ToAddresses: [username] // Using username as the email
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
