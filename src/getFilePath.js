const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, transactionId } = body;

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
      console.log(`Error: Transaction ${transactionId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Transaction not found" }),
      };
    }

    const attachment = transaction.ledger.attachments.find(
      (attachment) => attachment.fileType === 'receipt'
    );

    if (!attachment) {
      console.log(`Error: No receipt attachment found for transaction ${transactionId}`);
      return {
        statusCode: 404,
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
      const getAttachmentPayload = JSON.parse(new TextDecoder('utf-8').decode(getAttachmentResponse.Payload));

      if (getAttachmentResponse.FunctionError) {
        throw new Error(getAttachmentPayload.errorMessage || 'Failed to get presigned URL.');
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Presigned URL generated successfully",
          url: getAttachmentPayload.url,
        }),
      };
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      return {
        statusCode: 500,
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
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
