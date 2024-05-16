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

const generateDates = (firstPayDay, frequency, durationMonths) => {
  let dates = [];
  let currentDate = new Date(firstPayDay);
  const endDate = addMonths(new Date(firstPayDay), durationMonths);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
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
  const { familyId, name, amount, frequency, firstPayDay } = JSON.parse(event.body);

  try {
    const familyExists = await prisma.family.findUnique({ where: { familyId: familyId } });
    if (!familyExists) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Family not found' }) };
    }

    const incomeExists = await prisma.incomes.findFirst({ where: { familyId: familyId, name: name } });
    if (incomeExists) {
      return { statusCode: 409, body: JSON.stringify({ message: 'Income with the same name already exists' }) };
    }

    await prisma.incomes.create({
      data: {
        incomeId: uuidv4(),
        familyId: familyId,
        name: name,
        amount: amount,
        frequency: frequency,
        firstPayDay: firstPayDay,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const dates = generateDates(firstPayDay, frequency, 12);
    for (let date of dates) {
        const newTransaction = await prisma.transactionLedger.create({
          data: {
            transactionId: uuidv4(),
            familyId: familyId,
            amount: amount,
            transactionType: 'Income',
            transactionDate: date,
            category: 'Income - ' + name,
            description: `Income received for ${date.toISOString().slice(0, 10)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: 'system',
            runningTotal: 0, // Initially set, needs recalculation
          },
        });
  
        await prisma.calendar.create({
          data: {
            dateId: uuidv4(),
            familyId: familyId,
            eventName: `Income Received: ${name}`,
            eventDate: date,
            transactionId: newTransaction.transactionId,
            description: `Scheduled income for ${name} on ${date.toISOString().slice(0, 10)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
  
      // Trigger updateRunningTotals after all transactions are added
      await axios.post(`${UPDATE_RUNNING_TOTAL_URL}/updateRunningTotal`, { familyId: familyId });
  
      return { statusCode: 201, body: JSON.stringify({ message: 'Income created successfully' }) };
    } catch (error) {
      console.error(`Error creating income: ${error.message}`, { familyId: familyId, errorDetails: error });
      return { statusCode: 500, body: JSON.stringify({ message: 'Error creating income', error: error.message }) };
    }
  };
  