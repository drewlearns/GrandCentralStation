const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

exports.handler = async (event) => {
  let responseMessage;

  try {
    // Retrieve the region from the environment variables or default to 'us-east-1'
    const region = process.env.AWS_REGION || "us-east-1";
    console.log(`Using region: ${region}`);

    // Initialize the S3 client with the region and maxAttempts only
    const s3Client = new S3Client({
      region: region,
      maxAttempts: 3, // Retry a maximum of 3 times
    });

    console.log("S3Client initialized successfully");

    // List all S3 buckets
    const data = await s3Client.send(new ListBucketsCommand({}));
    responseMessage = `Buckets: ${data.Buckets.map(bucket => bucket.Name).join(", ")}`;
  } catch (err) {
    console.error("Error listing buckets:", err);
    responseMessage = `Error listing buckets: ${err.message}`;
  }

  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain"
    },
    body: responseMessage
  };

  return response;
};
