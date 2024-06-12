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
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, incomeId } = body;

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

    if (!incomeId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing incomeId parameter" }),
      };
    }

    const income = await prisma.incomes.findUnique({
      where: { incomeId: incomeId },
      include: {
        household: true,
        ledgers: true,
      },
    });

    if (!income) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Income not found" }),
      };
    }

    const flattenedResponse = {
      incomeId: income.incomeId,
      householdId: income.householdId,
      name: income.name,
      amount: income.amount,
      frequency: income.frequency,
      firstPayDay: income.firstPayDay,
      createdAt: income.createdAt,
      updatedAt: income.updatedAt,
      householdId: income.household.householdId,
      householdName: income.household.householdName,
      householdCreationDate: income.household.creationDate,
      householdCreatedAt: income.household.createdAt,
      householdUpdatedAt: income.household.updatedAt,
      householdSetupComplete: income.household.setupComplete,
      householdActiveSubscription: income.household.activeSubscription,
      ledgers: income.ledgers.map(ledger => ({
        ledgerId: ledger.ledgerId,
        householdId: ledger.householdId,
        paymentSourceId: ledger.paymentSourceId,
        amount: ledger.amount,
        transactionType: ledger.transactionType,
        transactionDate: ledger.transactionDate,
        category: ledger.category,
        description: ledger.description,
        status: ledger.status,
        ledgerCreatedAt: ledger.createdAt,
        ledgerUpdatedAt: ledger.updatedAt,
        updatedBy: ledger.updatedBy,
        billId: ledger.billId,
        incomeId: ledger.incomeId,
        runningTotal: ledger.runningTotal,
        interestRate: ledger.interestRate,
        cashBack: ledger.cashBack,
        tags: ledger.tags
      }))
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ income: flattenedResponse }),
    };
  } catch (error) {
    console.error('Error retrieving income:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error retrieving income", error: error.message }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
