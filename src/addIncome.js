const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { add, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval } = require("date-fns");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};
const calculateOccurrences = (startDate, frequency) => {
  let occurrences = [];
  const endDate = add(startDate, { months: 12 });

  switch (frequency) {
    case "once":
      occurrences.push(startDate);
      break;
    case "weekly":
      occurrences = eachWeekOfInterval({ start: startDate, end: endDate });
      break;
    case "biweekly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 14 === 0
      );
      break;
    case "monthly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate });
      break;
    case "bi-monthly":
      occurrences = eachDayOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 60 === 0
      );
      break;
    case "quarterly":
      occurrences = eachMonthOfInterval({ start: startDate, end: endDate }).filter(
        (date, index) => index % 3 === 0
      );
      break;
    case "annually":
      occurrences.push(add(startDate, { years: 1 }));
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return occurrences;
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { authorizationToken, householdId, name, amount, firstPayDay, frequency, description, paymentSourceId, tags } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Access denied. No token provided.'
        })
      };
    }

    let updatedBy;

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

      updatedBy = payload.username;
      if (!updatedBy) {
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

    const householdExists = await prisma.household.findUnique({
      where: { householdId: householdId },
    });

    if (!householdExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    const paymentSourceExists = await prisma.paymentSource.findUnique({
      where: { sourceId: paymentSourceId },
    });

    if (!paymentSourceExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" }),
      };
    }

    const newIncome = await prisma.incomes.create({
      data: {
        incomeId: uuidv4(),
        householdId: householdId,
        name: name,
        amount: parseFloat(amount),
        frequency: frequency,
        firstPayDay: new Date(firstPayDay),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const occurrences = calculateOccurrences(new Date(firstPayDay), frequency);

    for (const occurrence of occurrences) {
      await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: householdId,
          amount: parseFloat(amount),
          transactionType: "Credit",
          transactionDate: occurrence,
          category: 'Income',
          description: `${name} - ${description}`,
          status: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: updatedBy,
          incomeId: newIncome.incomeId,
          paymentSourceId: paymentSourceId,
          runningTotal: 0, // Initial placeholder
          tags: tags || `Income,${name}`, // Add the tags field here
        },
      });
    }

    // Invoke the secondary Lambda function to calculate running totals for the payment source
    const calculateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: householdId, paymentSourceId: paymentSourceId }),
    });

    await lambdaClient.send(calculateTotalsCommand);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Income and ledger entries added successfully",
        income: newIncome,
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
  } finally {
    await prisma.$disconnect();
  }
};
