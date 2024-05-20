const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, page, pageSize, ipAddress, deviceDetails } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Access denied. No token provided.'
      })
    };
  }

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
    if (page === undefined || pageSize === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing page or pageSize parameter" }),
      };
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [totalCount, auditTrails] = await prisma.$transaction([
      prisma.auditTrail.count(),
      prisma.auditTrail.findMany({
        skip: skip,
        take: take,
        orderBy: {
          timestamp: 'desc'
        }
      })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      statusCode: 200,
      body: JSON.stringify({
        auditTrails: auditTrails,
        page: page,
        pageSize: pageSize,
        totalPages: totalPages,
        totalCount: totalCount
      }),
    };
  } catch (error) {
    console.error('Error retrieving audit trails:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving audit trails", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
