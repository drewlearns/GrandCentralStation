const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { add, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval } = require("date-fns");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require('./tokenUtils');
const { refreshAndVerifyToken } = require('./refreshAndVerifyToken'); // Ensure this is correctly pointing to the file

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
  const { authorizationToken, refreshToken, billId, updates } = JSON.parse(event.body);

  if (!authorizationToken || !refreshToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Access denied. No token provided.",
      }),
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
        body: JSON.stringify({ message: 'Invalid token.', error: refreshError.message }),
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

  try {
    if (!billId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing billId parameter" }),
      };
    }

    if (!updates || typeof updates !== "object") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Missing or invalid updates parameter",
        }),
      };
    }

    const bill = await prisma.bill.findUnique({
      where: { billId: billId },
    });

    if (!bill) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Bill not found" }),
      };
    }

    // Update bill information
    const updatedBill = await prisma.bill.update({
      where: { billId: billId },
      data: {
        category: updates.category || bill.category,
        billName: updates.billName || bill.billName,
        amount: updates.amount !== undefined ? parseFloat(updates.amount) : bill.amount,
        dayOfMonth: updates.dayOfMonth !== undefined ? parseInt(updates.dayOfMonth) : bill.dayOfMonth,
        frequency: updates.frequency || bill.frequency,
        isDebt: updates.isDebt !== undefined ? updates.isDebt === "true" : bill.isDebt,
        interestRate: updates.interestRate !== undefined ? parseFloat(updates.interestRate) : bill.interestRate,
        cashBack: updates.cashBack !== undefined ? parseFloat(updates.cashBack) : bill.cashBack,
        description: updates.description || bill.description,
        status: updates.status || bill.status,
        url: updates.url || bill.url,
        username: updates.username || bill.username,
        password: updates.password || bill.password,
        tags: updates.tags || bill.tags,
        updatedAt: new Date(),
      },
    });

    // Delete existing ledger entries for this bill
    await prisma.ledger.deleteMany({
      where: { billId: billId },
    });

    // Calculate new occurrences
    const firstPayDay = new Date(updatedBill.updatedAt);
    const occurrences = calculateOccurrences(firstPayDay, updatedBill.frequency);

    for (const occurrence of occurrences) {
      await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: updatedBill.householdId,
          amount: updatedBill.amount,
          transactionType: "debit",
          transactionDate: occurrence,
          category: updatedBill.category,
          description: `${updatedBill.billName} - ${updatedBill.description}`,
          status: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: username,
          billId: updatedBill.billId,
          paymentSourceId: null, // Set this appropriately if you have a specific payment source
          runningTotal: 0, // Initial placeholder
          tags: updatedBill.tags || null, // Add the tags field here
        },
      });
    }

    // Get household members' emails if the householdId has changed
    let recipientEmails;
    if (updates.householdId && updates.householdId !== bill.householdId) {
      const householdMembers = await prisma.householdMembers.findMany({
        where: { householdId: updates.householdId },
        select: { member: { select: { email: true } } },
      });

      recipientEmails = householdMembers
        .map((member) => member.member.email)
        .join(";");
    } else {
      const householdMembers = await prisma.householdMembers.findMany({
        where: { householdId: bill.householdId },
        select: { member: { select: { email: true } } },
      });

      recipientEmails = householdMembers
        .map((member) => member.member.email)
        .join(";");
    }

    // Invoke the editNotification Lambda function
    const editNotificationCommand = new InvokeCommand({
      FunctionName: 'editNotification',
      Payload: JSON.stringify({
        authorizationToken: authorizationToken,
        notificationId: updates.notificationId, // Ensure this is provided in the updates
        billId: billId,
        title: `Updated Bill: ${updates.billName || bill.billName}`,
        message: `Your bill for ${updates.billName || bill.billName} has been updated.`,
        recipientEmail: recipientEmails,
        dayOfMonth: updates.dayOfMonth !== undefined ? parseInt(updates.dayOfMonth) : bill.dayOfMonth,
      }),
    });

    await lambdaClient.send(editNotificationCommand);

    // Calculate running totals
    const calculateTotalsCommand = new InvokeCommand({
      FunctionName: 'calculateRunningTotal',
      Payload: JSON.stringify({ householdId: updatedBill.householdId, paymentSourceId: updatedBill.paymentSourceId }),
    });

    await lambdaClient.send(calculateTotalsCommand);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Bill updated successfully",
        updatedBill,
      }),
    };
  } catch (error) {
    console.error(`Error updating bill ${billId}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Error updating bill",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
