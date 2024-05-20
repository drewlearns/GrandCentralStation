const { S3Client, GetObjectCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const BUCKET = process.env.BUCKET;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, filePath } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let username;

    // Verify token and retrieve username
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
      await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
      console.log(`Verified access to bucket ${BUCKET}`);
    } catch (err) {
      console.error(`Bucket ${BUCKET} does not exist or you have no access.`, err);
      return {
        statusCode: 400,
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

    console.log('presignedUrl:', presignedUrl);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Presigned URL generated successfully",
        url: presignedUrl, // Include the URL in the response
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
  }
};
