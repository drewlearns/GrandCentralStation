const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
  const { authorizationToken, billId } = JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
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
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Invalid token.',
        error: error.message,
      }),
    };
  }

  try {
    if (!billId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing billId parameter" }),
      };
    }

    const bill = await prisma.bill.findUnique({
      where: { billId: billId },
      select: {
        billId: true,
        billName: true,
        amount: true,
        frequency: true,
        status: true,
        category: true,
        description: true,
        dayOfMonth: true,
        isDebt: true,
        interestRate: true,
        cashBack: true,
        url: true,
        username: true,
        password: true,
        createdAt: true,
        updatedAt: true,
        notificationNotificationId: true,
      },
    });

    if (!bill) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Bill not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        bill: {
          billId: bill.billId,
          billName: bill.billName,
          amount: bill.amount,
          frequency: bill.frequency,
          status: bill.status,
          category: bill.category,
          description: bill.description,
          dayOfMonth: bill.dayOfMonth,
          isDebt: bill.isDebt,
          interestRate: bill.interestRate,
          cashBack: bill.cashBack,
          url: bill.url,
          username: bill.username,
          password: bill.password,
          createdAt: bill.createdAt,
          updatedAt: bill.updatedAt,
          notificationId: bill.notificationNotificationId,
        }
      }),
    };
  } catch (error) {
    console.error(`Error retrieving bill with id ${billId}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error retrieving bill", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
