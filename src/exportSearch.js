const { PrismaClient } = require("@prisma/client");
const { LambdaClient } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file

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
  let tokenValid = false;

  // Attempt to verify the token
  try {
    username = await verifyToken(authorizationToken);
    tokenValid = true;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.', error: error.message }),
    };
  }

  if (!tokenValid) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid token.' }),
    };
  }

  try {
    let ledgerEntries;
    if (reportType === 'yearEnd') {
      ledgerEntries = await prisma.ledger.groupBy({
        by: ['category', 'transactionDate', 'transactionType', 'runningTotal'],
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
          description: true,
          status: true,
          runningTotal: true,
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

    // Flatten the grouped results for yearEnd report type
    if (reportType === 'yearEnd') {
      ledgerEntries = ledgerEntries.map(entry => ({
        amount: entry._sum.amount,
        transactionDate: entry.transactionDate,
        transactionType: entry.transactionType,
        category: entry.category,
        runningTotal: entry.runningTotal,
      }));
    }

    const json2csvParser = new Parser({
      fields: ['amount', 'transactionDate', 'transactionType', 'category', 'description', 'status', 'runningTotal']
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
