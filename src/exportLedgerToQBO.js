const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { v4: uuidv4 } = require("uuid");
const { format } = require('date-fns');
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

function generateQBOContent(transactions) {
  let qboContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${format(new Date(), 'yyyyMMddHHmmss')}</DTSERVER>
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>${uuidv4()}</TRNUID>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>999999999
<ACCTID>999999999
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${format(transactions[0].transactionDate, 'yyyyMMdd')}</DTSTART>
<DTEND>${format(transactions[transactions.length - 1].transactionDate, 'yyyyMMdd')}</DTEND>
`;

  transactions.forEach(transaction => {
    qboContent += `
<STMTTRN>
<TRNTYPE>${transaction.transactionType.toUpperCase()}
<DTPOSTED>${format(transaction.transactionDate, 'yyyyMMddHHmmss')}
<TRNAMT>${transaction.amount.toFixed(2)}
<FITID>${transaction.transactionDate.getTime()}
<NAME>${transaction.category}
<MEMO>${transaction.description}
</STMTTRN>
`;
  });

  qboContent += `
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00
<DTASOF>${format(new Date(), 'yyyyMMddHHmmss')}</DTASOF>
</LEDGERBAL>
<AVAILBAL>
<BALAMT>0.00
<DTASOF>${format(new Date(), 'yyyyMMddHHmmss')}</DTASOF>
</AVAILBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

  return qboContent;
}

exports.handler = async (event) => {
  const { authorizationToken, householdId, paymentSourceId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
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
  const s3Key = `ledger-exports/${uuidv4()}.qbo`;

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

    const qboContent = generateQBOContent(ledgerEntries);

    const s3Params = {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: qboContent,
      ContentType: "application/vnd.intu.qbo"
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
            Data: `Hello,\n\nYour requested QBO export is ready. You can download it from the following link:\n\n${presignedUrl}\n\nThis link will expire in 1 hour.\n\nBest regards,\nThe Purple Piggy Bank Team`
          }
        },
        Subject: {
          Data: "Your Requested QBO Export is Ready"
        }
      },
      Source: "noreply@app.thepurplepiggybank.com"
    };

    const sendEmailCommand = new SendEmailCommand(sesParams);
    await sesClient.send(sendEmailCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "QBO export successful and email sent", presignedUrl: presignedUrl }),
    };
  } catch (error) {
    console.error('Error exporting ledger to QBO and sending email:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error exporting ledger to QBO and sending email", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
