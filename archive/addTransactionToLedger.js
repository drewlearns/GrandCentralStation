const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const Busboy = require("busboy");
const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const os = require("os");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.BUCKET;
const UPDATE_RUNNING_TOTAL_LAMBDA = 'updateRunningTotal';

console.log(`AWS_REGION: ${REGION}`);
console.log(`BUCKET: ${BUCKET}`);
console.log(`UPDATE_RUNNING_TOTAL_LAMBDA: ${UPDATE_RUNNING_TOTAL_LAMBDA}`);

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
            originalFilename: uuidv4(),
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

    const {
      familyId,
      amount,
      transactionType,
      transactionDate,
      category,
      description,
      updatedBy,
    } = fields;

    const familyExists = await prisma.family.findUnique({
      where: { familyId: familyId },
    });

    if (!familyExists) {
      console.log(`Error: Family ${familyId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Family not found" }),
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

    const runningTotal = await getRunningTotal(familyId); // Assuming you have a function to calculate running total

    const newTransaction = await prisma.transactionLedger.create({
      data: {
        transactionId: uuidv4(),
        familyId: familyId,
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
      },
    });

    // Invoke the updateRunningTotal Lambda function using AWS SDK v3
    const params = {
      FunctionName: UPDATE_RUNNING_TOTAL_LAMBDA,
      InvocationType: "Event", // Use "RequestResponse" for synchronous invocation
      Payload: JSON.stringify({ familyId: familyId }),
    };

    try {
      const command = new InvokeCommand(params);
      const data = await lambdaClient.send(command);
      console.log(`Update running total Lambda invoked successfully: ${data}`);
    } catch (error) {
      console.error(`Error invoking updateRunningTotal Lambda: ${error.message}`);
      throw new Error("Failed to update running total");
    }

    console.log(`Success: Transaction added to ledger for family ${familyId}`);
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

async function getRunningTotal(familyId) {
  // Implement this function based on your business logic to calculate the running total
  // Example:
  const transactions = await prisma.transactionLedger.findMany({
    where: { familyId: familyId },
  });

  return transactions.reduce((total, transaction) => {
    if (transaction.transactionType.toLowerCase() === 'debit') {
      return total - transaction.amount;
    } else {
      return total + transaction.amount;
    }
  }, 0);
}
