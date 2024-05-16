const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios'); // Ensure axios is installed for making HTTP requests

// Utility functions...
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const generateDates = (startDate, frequency, dayOfMonth, durationMonths) => {
  let dates = [];
  let currentDate = new Date(startDate);
  const endDate = addMonths(new Date(startDate), durationMonths);

  while (currentDate <= endDate) {
    currentDate.setDate(dayOfMonth);
    if (currentDate <= endDate) {
      dates.push(new Date(currentDate));
    }

    switch (frequency) {
      case 'monthly': currentDate = addMonths(currentDate, 1); break;
      case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
      case 'biweekly': currentDate.setDate(currentDate.getDate() + 14); break;
      case 'quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'annual': currentDate = addMonths(currentDate, 12); break;
    }
  }
  return dates;
};

exports.handler = async (event) => {
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

  try {
    const familyExists = await prisma.family.findUnique({ where: { familyId: familyId } });
    if (!familyExists) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Family not found' }) };
    }

    const billId = uuidv4();
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

    const startDate = new Date();
    const dates = generateDates(startDate, frequency, dayOfMonth, 12);
    for (let date of dates) {
      const newTransaction = await prisma.transactionLedger.create({
        data: {
          transactionId: uuidv4(),
          familyId: familyId,
          amount: amount,
          transactionType: 'Expense',
          transactionDate: date,
          category: 'Bill - ' + billName,
          description: `Bill payment for ${date.toISOString().slice(0, 10)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'system',
          runningTotal: 0,
        },
      });

      await prisma.calendar.create({
        data: {
          dateId: uuidv4(),
          familyId: familyId,
          eventName: `Bill Payment: ${billName}`,
          eventDate: date,
          transactionId: newTransaction.transactionId,
          description: `Scheduled payment for ${billName} on ${date.toISOString().slice(0, 10)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // Trigger updateRunningTotals after all transactions are added
    await axios.post(`${process.env.API_URL}/updateRunningTotal`, { familyId: familyId });

    return { statusCode: 200, body: JSON.stringify({ message: 'Bill successfully added to the family', bill: newBill }) };
  } catch (error) {
    console.error(`Error adding bill to family ${familyId}:`, error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error adding bill to the family', error: error.message }) };
  }
};
