const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  // Create two users
  const user1 = await prisma.user.create({
    data: {
      uuid: uuidv4(),
      username: 'john_doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '1234567890',
      signupDate: new Date(),
      mailOptIn: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedEmail: true,
      subscriptionStatus: 'active'
    }
  });

  const user2 = await prisma.user.create({
    data: {
      uuid: uuidv4(),
      username: 'jane_doe',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phoneNumber: '0987654321',
      signupDate: new Date(),
      mailOptIn: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedEmail: true,
      subscriptionStatus: 'active'
    }
  });

  // Create two households
  const household1 = await prisma.household.create({
    data: {
      householdId: uuidv4(),
      householdName: 'Doe Family Household 1',
      creationDate: new Date(),
      customHouseholdNameSuchAsCrew: 'The Doe Crew 1',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: 'account_1',
      setupComplete: true,
      activeSubscription: true
    }
  });

  const household2 = await prisma.household.create({
    data: {
      householdId: uuidv4(),
      householdName: 'Doe Family Household 2',
      creationDate: new Date(),
      customHouseholdNameSuchAsCrew: 'The Doe Crew 2',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: 'account_2',
      setupComplete: true,
      activeSubscription: true
    }
  });

  // Add users to households
  await prisma.householdMembers.create({
    data: {
      id: uuidv4(),
      householdId: household1.householdId,
      memberUuid: user1.uuid,
      role: 'Owner',
      joinedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  await prisma.householdMembers.create({
    data: {
      id: uuidv4(),
      householdId: household2.householdId,
      memberUuid: user2.uuid,
      role: 'Owner',
      joinedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create one transaction per month for 2024 for each household
  for (let month = 0; month < 12; month++) {
    const date = new Date(2024, month, 1);

    await prisma.ledger.create({
      data: {
        ledgerId: uuidv4(),
        householdId: household1.householdId,
        amount: 100 + month,
        transactionType: 'Expense',
        transactionDate: date,
        category: 'Groceries',
        description: `Grocery shopping for ${date.toLocaleString('default', { month: 'long' })}`,
        status: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user1.uuid,
        runningTotal: 1000 - (100 + month),
      }
    });

    await prisma.ledger.create({
      data: {
        ledgerId: uuidv4(),
        householdId: household2.householdId,
        amount: 200 + month,
        transactionType: 'Expense',
        transactionDate: date,
        category: 'Utilities',
        description: `Utility bill for ${date.toLocaleString('default', { month: 'long' })}`,
        status: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user2.uuid,
        runningTotal: 2000 - (200 + month),
      }
    });
  }

  // Create one monthly bill for each household
  const bill1 = await prisma.bill.create({
    data: {
      billId: uuidv4(),
      householdId: household1.householdId,
      category: 'Rent',
      billName: 'Monthly Rent',
      amount: 1500,
      dayOfMonth: 1,
      frequency: 'monthly',
      isDebt: false,
      description: 'Monthly apartment rent',
      status: 'pending',
      url: 'http://example.com',
      username: 'landlord',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const bill2 = await prisma.bill.create({
    data: {
      billId: uuidv4(),
      householdId: household2.householdId,
      category: 'Internet',
      billName: 'Monthly Internet',
      amount: 60,
      dayOfMonth: 1,
      frequency: 'monthly',
      isDebt: false,
      description: 'Monthly internet bill',
      status: 'pending',
      url: 'http://example.com',
      username: 'isp',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create one bi-weekly income for each household
  await prisma.incomes.create({
    data: {
      incomeId: uuidv4(),
      householdId: household1.householdId,
      name: 'Salary',
      amount: 2000,
      frequency: 'bi-weekly',
      firstPayDay: new Date(2024, 0, 1),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  await prisma.incomes.create({
    data: {
      incomeId: uuidv4(),
      householdId: household2.householdId,
      name: 'Freelance',
      amount: 1500,
      frequency: 'bi-weekly',
      firstPayDay: new Date(2024, 0, 1),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create some notifications
  await prisma.notification.create({
    data: {
      notificationId: uuidv4(),
      userUuid: user1.uuid,
      title: 'Welcome!',
      message: 'Welcome to the Doe Family Household 1',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  await prisma.notification.create({
    data: {
      notificationId: uuidv4(),
      userUuid: user2.uuid,
      title: 'Welcome!',
      message: 'Welcome to the Doe Family Household 2',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  await prisma.notification.create({
    data: {
      notificationId: uuidv4(),
      userUuid: user1.uuid,
      title: 'Monthly Rent Due',
      message: 'Your monthly rent is due tomorrow.',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      billId: bill1.billId
    }
  });

  await prisma.notification.create({
    data: {
      notificationId: uuidv4(),
      userUuid: user2.uuid,
      title: 'Monthly Internet Due',
      message: 'Your monthly internet bill is due tomorrow.',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      billId: bill2.billId
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
