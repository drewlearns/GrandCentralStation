const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function createUser(userData) {
  try {
    return await prisma.user.create({
      data: userData
    });
  } catch (error) {
    if (error.code === 'P2002' && error.meta && error.meta.target.includes('email')) {
      console.log(`User with email ${userData.email} already exists. Skipping...`);
    } else {
      throw error;
    }
  }
}

async function main() {
  // Create users with error handling for unique constraint on email
  const user1 = await createUser({
    uuid: uuidv4(),
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    signupDate: new Date(),
    mailOptIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedEmail: true,
    subscriptionStatus: 'active'
  });

  const user2 = await createUser({
    uuid: uuidv4(),
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    signupDate: new Date(),
    mailOptIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedEmail: true,
    subscriptionStatus: 'active'
  });

  // Only proceed if users were created successfully
  if (user1 && user2) {
    // Create households
    const household1 = await prisma.household.create({
      data: {
        householdId: uuidv4(),
        householdName: 'Doe Family Household 1',
        creationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        setupComplete: true,
        activeSubscription: true
      }
    });

    const household2 = await prisma.household.create({
      data: {
        householdId: uuidv4(),
        householdName: 'Doe Family Household 2',
        creationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
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

    // Create payment sources for the households
    const paymentSource1 = await prisma.paymentSource.create({
      data: {
        sourceId: uuidv4(),
        householdId: household1.householdId,
        sourceName: 'Main Bank Account',
        sourceType: 'Bank',
        description: 'Main household bank account',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const paymentSource2 = await prisma.paymentSource.create({
      data: {
        sourceId: uuidv4(),
        householdId: household2.householdId,
        sourceName: 'Savings Account',
        sourceType: 'Bank',
        description: 'Household savings account',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create transactions for 2024 for each household
    for (let month = 0; month < 12; month++) {
      const date = new Date(2024, month, 1);

      await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: household1.householdId,
          paymentSourceId: paymentSource1.sourceId,
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
          paymentSourceId: paymentSource2.sourceId,
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

    // Create monthly bills for each household
    const bill1 = await prisma.bill.create({
      data: {
        billId: uuidv4(),
        householdId: household1.householdId,
        category: 'Rent',
        billName: 'Monthly Rent',
        amount: 1500,
        dayOfMonth: 1,
        frequency: 'monthly',
        description: 'Monthly apartment rent',
        status: false,
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
        description: 'Monthly internet bill',
        status: false,
        url: 'http://example.com',
        username: 'isp',
        password: 'password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create bi-weekly incomes for each household
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

    // Create notifications for each user related to their bills
    await prisma.notification.create({
      data: {
        notificationId: uuidv4(),
        userUuid: user1.uuid,
        title: 'Monthly Rent Due',
        message: 'Your monthly rent is due tomorrow.',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: new Date(2024, new Date().getMonth(), 1), // Include dueDate
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
        dueDate: new Date(2024, new Date().getMonth(), 1), // Include dueDate
        billId: bill2.billId
      }
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
