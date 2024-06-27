const { S3Client, GetObjectCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const BUCKET = process.env.BUCKET;
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  try {
    let body;
    if (event.body) {
      // When event body is provided as a string
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        console.error('Failed to parse event body:', event.body);
        throw new Error(`Invalid JSON format: ${event.body}`);
      }
    } else {
      // When event body is directly provided
      body = event;
    }

    const { filePath } = body;

    if (!filePath) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'File path is required.'
        })
      };
    }

    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch (err) {
      console.error(`Bucket ${BUCKET} does not exist or you have no access.`, err);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: `Bucket ${BUCKET} does not exist or you have no access.`,
          error: err.message,
        }),
      };
    }

    const getObjectParams = {
      Bucket: BUCKET,
      Key: filePath,
    };

    const command = new GetObjectCommand(getObjectParams);
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Presigned URL generated successfully",
        url: presignedUrl,
      }),
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  }
};
