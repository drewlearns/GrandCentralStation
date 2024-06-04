const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const { format } = require('date-fns');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

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

  const s3Bucket = process.env.BUCKET;
  const s3Key = `ledger-exports/${uuidv4()}.qbo`;

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

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "QBO export successful", presignedUrl: presignedUrl }),
    };
  } catch (error) {
    console.error('Error exporting ledger to QBO:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error exporting ledger to QBO", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
