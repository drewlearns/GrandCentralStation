const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
};

// Verify token function
async function verifyToken(token) {
  const params = {
    FunctionName: 'verifyToken', // Replace with your actual Lambda function name
    Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
  };

  const command = new InvokeCommand(params);
  const response = await lambdaClient.send(command);

  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  if (payload.errorMessage) {
    throw new Error(payload.errorMessage);
  }

  const nestedPayload = JSON.parse(payload.body);
  return nestedPayload;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }

  try {
    // Ensure event.body is parsed correctly
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { authToken, transactionId } = body;

    if (!authToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Access denied. No authorization token provided.',
        }),
      };
    }

    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Parsed body:', body);
    console.log('Authorization token:', authToken);
    console.log('Transaction ID:', transactionId);

    // Verify the token
    const tokenPayload = await verifyToken(authToken);

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
    console.log('File path:', filePath);

    // Invoke getAttachment Lambda function to get presigned URL
    try {
      const getAttachmentCommand = new InvokeCommand({
        FunctionName: 'getAttachment',
        Payload: JSON.stringify({ filePath }), // No authToken needed
      });

      const getAttachmentResponse = await lambdaClient.send(getAttachmentCommand);
      const payloadString = new TextDecoder('utf-8').decode(getAttachmentResponse.Payload);
      console.log('getAttachment Payload:', payloadString);

      const getAttachmentPayload = JSON.parse(payloadString);
      const bodyPayload = JSON.parse(getAttachmentPayload.body);

      console.log('getAttachment response:', getAttachmentPayload);

      if (getAttachmentResponse.FunctionError) {
        throw new Error(bodyPayload.errorMessage || 'Failed to get presigned URL.');
      }

      if (!bodyPayload.url) {
        throw new Error('Presigned URL is missing in the response.');
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
      statusCode: error.statusCode || 500,
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
