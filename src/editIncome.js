const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { add, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval } = require("date-fns");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const calculateOccurrences = (startDate, frequency) => {
  let occurrences = [];
  const endDate = add(startDate, { months: 60 });

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
    const { authorizationToken, incomeId, householdId, name, amount, firstPayDay, frequency, description, paymentSourceId, tags } = body;

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
      console.log(`Error: Household ${householdId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Household not found" }),
      };
    }

    const paymentSourceExists = await prisma.paymentSource.findUnique({
      where: { sourceId: paymentSourceId },
    });

    if (!paymentSourceExists) {
      console.log(`Error: Payment source ${paymentSourceId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Payment source not found" }),
      };
    }

    const incomeExists = await prisma.incomes.findUnique({
      where: { incomeId: incomeId },
    });

    if (!incomeExists) {
      console.log(`Error: Income ${incomeId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Income not found" }),
      };
    }

    const updatedIncome = await prisma.incomes.update({
      where: { incomeId: incomeId },
      data: {
        name: name,
        amount: parseFloat(amount),
        frequency: frequency,
        firstPayDay: new Date(firstPayDay),
        updatedAt: new Date(),
        tags: tags || incomeExists.tags, // Add tags field here
      },
    });

    await prisma.ledger.deleteMany({
      where: { incomeId: incomeId },
    });

    const occurrences = calculateOccurrences(new Date(firstPayDay), frequency);

    for (const occurrence of occurrences) {
      await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: householdId,
          amount: parseFloat(amount),
          transactionType: "credit",
          transactionDate: occurrence,
          category: 'Income',
          description: `${name} - ${description}`,
          status: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: updatedBy,
          incomeId: updatedIncome.incomeId,
          paymentSourceId: paymentSourceId,
          runningTotal: 0, // Initial placeholder
          tags: tags || null, // Add the tags field here
        },
      });
    }

    const calculateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: householdId, paymentSourceId: paymentSourceId }),
    });

    await lambdaClient.send(calculateTotalsCommand);

    console.log(`Success: Income and ledger entries updated for household ${householdId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Income and ledger entries updated successfully",
        income: updatedIncome,
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
  } finally {
    await prisma.$disconnect();
  }
};
