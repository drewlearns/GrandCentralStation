const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { verifyToken } = require('./tokenUtils'); // Ensure this is correctly pointing to the file
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  try {
    // Ensure event.body is parsed correctly
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { authorizationToken, refreshToken, transactionId } = body;

    if (!authorizationToken || !refreshToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No token or refresh token provided.'
        })
      };
    }

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
          body: JSON.stringify({
            message: 'Invalid token.',
            error: refreshError.message,
          }),
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

    // Fetch transaction and attachment details
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId: transactionId },
      include: {
        ledger: {
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!transaction) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Transaction not found" }),
      };
    }

    const attachment = transaction.ledger.attachments.find(
      (attachment) => attachment.fileType === 'receipt'
    );

    if (!attachment) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Attachment not found" }),
      };
    }

    const filePath = attachment.filePath;

    // Invoke getAttachment Lambda function to get presigned URL
    try {
      const getAttachmentCommand = new InvokeCommand({
        FunctionName: 'getAttachment',
        Payload: JSON.stringify({ authorizationToken, filePath })
      });

      const getAttachmentResponse = await lambdaClient.send(getAttachmentCommand);
      const payloadString = new TextDecoder('utf-8').decode(getAttachmentResponse.Payload);
      const getAttachmentPayload = JSON.parse(payloadString);
      const bodyPayload = JSON.parse(getAttachmentPayload.body);

      if (getAttachmentResponse.FunctionError) {
        throw new Error(bodyPayload.errorMessage || 'Failed to get presigned URL.');
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Presigned URL generated successfully",
          url: bodyPayload.url, // Include the URL in the response
        }),
      };
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Failed to get presigned URL.',
          error: error.message,
        }),
      };
    }
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
  } finally {
    await prisma.$disconnect();
  }
};
