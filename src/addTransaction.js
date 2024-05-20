const Busboy = require("busboy");
const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const fs = require("fs");
const path = require("path");
const os = require("os");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const BUCKET = process.env.BUCKET;

const uploadToS3 = async (bucket, key, body) => {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Verified access to bucket ${bucket}`);
  } catch (err) {
    console.error(`Bucket ${bucket} does not exist or you have no access.`, err);
    throw new Error(`Bucket ${bucket} does not exist or you have no access.`);
  }

  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'image/jpeg'  // Ensure ContentType is set correctly
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    console.log(`Successfully uploaded data to ${bucket}/${key}`);
  } catch (err) {
    console.error(`Error uploading to S3: ${err.message}`, err);
    throw new Error(`Error uploading to S3: ${err.message}`);
  }
};

exports.handler = async (event) => {
  const result = {
    fields: {},
    files: [],
  };

  const processForm = async () => {
    return new Promise((resolve, reject) => {
      console.log("Headers:", JSON.stringify(event.headers, null, 2));

      let buffer;
      try {
        buffer = Buffer.from(
          event.body,
          event.isBase64Encoded ? "base64" : "utf8"
        );
        console.log("Body length:", buffer.length);
      } catch (err) {
        console.error("Error parsing request body:", err);
        return reject(new Error("Failed to parse request body"));
      }

      const headers = {
        "content-type":
          event.headers["content-type"] || event.headers["Content-Type"],
        "content-length": buffer.length,
      };

      console.log("Calculated Content-Length:", buffer.length);

      const busboy = Busboy({ headers });

      busboy.on("file", (fieldname, file, filename, encoding) => {
        console.log(`Processing file: ${filename}`);
        console.log(`File encoding: ${encoding}`);
        const filepath = path.join(os.tmpdir(), uuidv4());
        console.log(`Generated filepath: ${filepath}`);
        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);
        file.on("end", () => {
          console.log(`File [${filename}] saved to [${filepath}]`);
          result.files.push({
            fieldname,
            originalFilename: filename,
            filepath,
            encoding,
          });
        });
        file.on("error", (error) => {
          console.error(`Error processing file [${filename}]:`, error);
          reject(new Error("Failed to process file"));
        });
      });

      busboy.on("field", (fieldname, val) => {
        console.log(`Processing field: ${fieldname} = ${val}`);
        result.fields[fieldname] = val;
      });

      busboy.on("finish", () => {
        console.log("Finished processing form");
        resolve(result);
      });

      busboy.on("error", (error) => {
        console.error("Busboy error:", error);
        reject(error);
      });

      busboy.end(buffer);
    });
  };

  try {
    const { fields, files } = await processForm();
    console.log("Fields:", JSON.stringify(fields, null, 2));
    console.log("Files:", JSON.stringify(files, null, 2));

    const { authorizationToken, householdId, amount, transactionType, transactionDate, category, description, ipAddress, deviceDetails, status, sourceId, tags } = fields;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;

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

      updatedBy = payload.username;
      if (!updatedBy) {
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

    const householdExists = await prisma.household.findUnique({
      where: { householdId: householdId },
    });

    if (!householdExists) {
      console.log(`Error: Household ${householdId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    const paymentSourceExists = await prisma.paymentSource.findUnique({
      where: { sourceId: sourceId },
    });

    if (!paymentSourceExists) {
      console.log(`Error: Payment source ${sourceId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" }),
      };
    }

    const imageFile = files.find((file) => file.fieldname === "image");
    let filePath = null;

    if (imageFile) {
      console.log("Image file details:", imageFile);
      const fileStream = fs.createReadStream(imageFile.filepath);
      const imageKey = `transaction-images/${uuidv4()}`;

      console.log(`Uploading to S3: Bucket=${BUCKET}, Key=${imageKey}`);

      await uploadToS3(BUCKET, imageKey, fileStream);
      filePath = imageKey;
    }

    const runningTotal = await getRunningTotal(householdId, sourceId);

    // Ledger Table Entry
    const newLedger = await prisma.ledger.create({
      data: {
        ledgerId: uuidv4(),
        householdId: householdId,
        paymentSourceId: sourceId,  // Add paymentSourceId here
        amount: parseFloat(amount),
        transactionType: transactionType,
        transactionDate: new Date(transactionDate),
        category: category,
        description: description,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: updatedBy,
        runningTotal: transactionType.toLowerCase() === 'debit' ? runningTotal - parseFloat(amount) : runningTotal + parseFloat(amount),
        attachments: imageFile
          ? {
              create: {
                attachmentId: uuidv4(),
                fileType: "receipt",
                filePath: filePath,
                uploadDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            }
          : undefined,
        status: status === "true", // Ensure status is provided
        tags: tags || null, // Add the tags field here
      },
    });

    // Transaction Table Entry
    const newTransaction = await prisma.transaction.create({
      data: {
        transactionId: uuidv4(),
        ledgerId: newLedger.ledgerId, // Use the same ID as in the Ledger entry
        sourceId: sourceId, // Payment source ID
        amount: parseFloat(amount),
        transactionDate: new Date(transactionDate),
        description: description,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.auditTrail.create({
      data: {
        auditId: uuidv4(),
        tableAffected: 'Ledger',
        actionType: 'Create',
        oldValue: '',
        newValue: JSON.stringify(newLedger),
        changedBy: updatedBy,
        changeDate: new Date(),
        timestamp: new Date(),
        device: deviceDetails,
        ipAddress: ipAddress,
        deviceType: '',
        ssoEnabled: 'false',
      },
    });

    console.log(`Success: Transaction added to ledger and transaction table for household ${householdId}`);
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Transaction added successfully",
        transaction: newTransaction,
      }),
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
    result.files.forEach((file) => {
      if (typeof file.filepath === "string") {
        try {
          fs.unlinkSync(file.filepath);
        } catch (err) {
          console.error(`Error deleting file [${file.filepath}]:`, err);
        }
      } else {
        console.error(`Invalid filepath: ${file.filepath}`);
      }
    });
  }
};

async function getRunningTotal(householdId, paymentSourceId) {
  const transactions = await prisma.ledger.findMany({
    where: {
      householdId: householdId,
      paymentSourceId: paymentSourceId,
    },
  });

  return transactions.reduce((total, transaction) => {
    if (transaction.transactionType.toLowerCase() === 'debit') {
      return total - transaction.amount;
    } else {
      return total + transaction.amount;
    }
  }, 0);
}
