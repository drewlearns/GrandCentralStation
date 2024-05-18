const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const ADD_TRANSACTIONS_LAMBDA = 'addTransactionsToLedger'; // Ensure this is the correct name for your Lambda function

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const {
    familyId,
    category,
    billName,
    amount,
    dayOfMonth,
    frequency,
    isDebt,
    interestRate,
    totalDebt,
    description,
    status,
    url,
    username,
    password
  } = JSON.parse(event.body);

  console.log("Parsed event body:", {
    familyId, category, billName, amount, dayOfMonth, frequency,
    isDebt, interestRate, totalDebt, description, status, url, username, password
  });

  try {
    console.log(`Checking if family ${familyId} exists`);
    const familyExists = await prisma.family.findUnique({ where: { familyId: familyId } });
    if (!familyExists) {
      console.log(`Family ${familyId} not found`);
      return { statusCode: 404, body: JSON.stringify({ message: 'Family not found' }) };
    }

    const billId = uuidv4();
    console.log(`Creating new bill with ID ${billId}`);
    const newBill = await prisma.billTable.create({
      data: {
        billId: billId,
        familyId: familyId,
        category: category,
        billName: billName,
        amount: amount,
        dayOfMonth: dayOfMonth,
        frequency: frequency,
        isDebt: isDebt,
        interestRate: interestRate,
        totalDebt: totalDebt,
        description: description,
        status: status,
        url: url,
        username: username,
        password: password,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Generate transaction dates based on frequency and current date
    const transactions = generateTransactionDates(frequency, dayOfMonth, amount, category, description, billName);

    // Invoke the addTransactionsToLedger Lambda for each transaction
    for (const transaction of transactions) {
      const params = {
        FunctionName: ADD_TRANSACTIONS_LAMBDA,
        InvocationType: "Event", // Use "Event" for asynchronous invocation
        Payload: JSON.stringify({
          familyId: familyId,
          amount: transaction.amount,
          transactionType: "debit",
          transactionDate: transaction.transactionDate,
          category: transaction.category,
          description: transaction.description,
          updatedBy: billName,
        }),
      };

      try {
        console.log("Invoking addTransactionsToLedger Lambda");
        const command = new InvokeCommand(params);
        await lambdaClient.send(command);
        console.log("addTransactionsToLedger Lambda invoked successfully");
      } catch (error) {
        console.error(`Error invoking addTransactionsToLedger Lambda: ${error.message}`);
        // Do not throw error, as we don't want to block the main process
      }
    }

    console.log(`Bill successfully added to the family with ID ${billId}`);
    return { statusCode: 200, body: JSON.stringify({ message: 'Bill successfully added to the family', bill: newBill }) };
  } catch (error) {
    console.error(`Error adding bill to family ${familyId}:`, error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error adding bill to the family', error: error.message }) };
  } finally {
    await prisma.$disconnect();
  }
};

// Helper function to generate transaction dates based on frequency
function generateTransactionDates(frequency, dayOfMonth, amount, category, description, updatedBy) {
  const transactions = [];
  const today = new Date();
  let currentDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);

  switch (frequency) {
    case 'monthly':
      for (let i = 0; i < 12; i++) {
        transactions.push({
          amount: amount,
          transactionDate: new Date(currentDate),
          category: category,
          description: description,
          updatedBy: updatedBy
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      break;
    case 'weekly':
      for (let i = 0; i < 52; i++) {
        transactions.push({
          amount: amount,
          transactionDate: new Date(currentDate),
          category: category,
          description: description,
          updatedBy: updatedBy
        });
        currentDate.setDate(currentDate.getDate() + 7);
      }
      break;
    // Add more cases for other frequencies as needed
    default:
      console.error(`Unknown frequency: ${frequency}`);
  }

  return transactions;
}
