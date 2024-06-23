const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: 'us-east-1' }); // Adjust the region as necessary
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
};

// Verify token function
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
  try {
    // Ensure event.body is parsed correctly
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { authorizationToken, transactionId } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No authorization token provided.',
        }),
      };
    }

    // Verify the token
    const isValid = await verifyToken(authorizationToken);
    if (!isValid) {
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
        body: JSON.stringify({ message: 'Transaction not found' }),
      };
    }

    const attachment = transaction.ledger.attachments.find(
      (attachment) => attachment.fileType === 'receipt'
    );

    if (!attachment) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Attachment not found' }),
      };
    }

    const filePath = attachment.filePath;

    // Invoke getAttachment Lambda function to get presigned URL
    try {
      const getAttachmentCommand = new InvokeCommand({
        FunctionName: 'getAttachment',
        Payload: JSON.stringify({ authorizationToken, filePath }),
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
          message: 'Presigned URL generated successfully',
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
        message: 'Error processing request',
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
