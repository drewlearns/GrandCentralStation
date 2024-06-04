const { PrismaClient } = require("@prisma/client");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const { authorizationToken, billId, updates} =
    JSON.parse(event.body);

  if (!authorizationToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Access denied. No token provided.",
      }),
    };
  }

  let username;
  try {
    const verifyTokenCommand = new InvokeCommand({
      FunctionName: "verifyToken",
      Payload: JSON.stringify({ authorizationToken }),
    });

    const verifyTokenResponse = await lambdaClient.send(verifyTokenCommand);
    const payload = JSON.parse(
      new TextDecoder("utf-8").decode(verifyTokenResponse.Payload)
    );

    if (verifyTokenResponse.FunctionError) {
      throw new Error(payload.errorMessage || "Token verification failed.");
    }

    username = payload.username;
    if (!username) {
      throw new Error("Token verification did not return a valid username.");
    }
  } catch (error) {
    console.error("Token verification failed:", error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Invalid token.",
        error: error.message,
      }),
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
        body: JSON.stringify({ message: "Bill not found" }),
      };
    }

    // Update bill information
    const updatedBill = await prisma.bill.update({
      where: { billId: billId },
      data: {
        category: updates.category || bill.category,
        billName: updates.billName || bill.billName,
        amount:
          updates.amount !== undefined
            ? parseFloat(updates.amount)
            : bill.amount,
        dayOfMonth:
          updates.dayOfMonth !== undefined
            ? parseInt(updates.dayOfMonth)
            : bill.dayOfMonth,
        frequency: updates.frequency || bill.frequency,
        isDebt:
          updates.isDebt !== undefined
            ? updates.isDebt === "true"
            : bill.isDebt,
        interestRate:
          updates.interestRate !== undefined
            ? parseFloat(updates.interestRate)
            : bill.interestRate,
        cashBack:
          updates.cashBack !== undefined
            ? parseFloat(updates.cashBack)
            : bill.cashBack,
        description: updates.description || bill.description,
        status: updates.status || bill.status,
        url: updates.url || bill.url,
        username: updates.username || bill.username,
        password: updates.password || bill.password,
        tags: updates.tags || bill.tags,
        updatedAt: new Date(),
      },
    });

    // Get household members' emails if the billId or householdId has changed
    let recipientEmails;
    if (updates.householdId && updates.householdId !== bill.householdId) {
      const householdMembers = await prisma.householdMembers.findMany({
        where: { householdId: updates.householdId },
        select: { user: { select: { email: true } } },
      });

      recipientEmails = householdMembers
        .map((member) => member.user.email)
        .join(";");
    } else {
      const householdMembers = await prisma.householdMembers.findMany({
        where: { householdId: bill.householdId },
        select: { user: { select: { email: true } } },
      });

      recipientEmails = householdMembers
        .map((member) => member.user.email)
        .join(";");
    }

    // Log the payload for editNotification
    console.log("Payload for editNotification:", {
      authorizationToken: authorizationToken,
      notificationId: updates.notificationId, // Assuming notificationId is provided in the updates
      billId: billId,
      title: `Updated Bill: ${updates.billName || bill.billName}`,
      message: `Your bill for ${
        updates.billName || bill.billName
      } has been updated.`,
      recipientEmail: recipientEmails,
    });

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

    const response = await lambdaClient.send(editNotificationCommand);

    // Log the response from editNotification
    console.log("Response from editNotification:", response);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Bill updated successfully",
        updatedBill,
      }),
    };
  } catch (error) {
    console.error(`Error updating bill ${billId}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error updating bill",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
