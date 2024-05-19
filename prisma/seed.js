const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create sample users
  const user1 = await prisma.user.create({
    data: {
      uuid: 'uuid1',
      username: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '123-456-7890',
      signupDate: new Date('2023-01-01T00:00:00Z'),
      mailOptIn: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedEmail: true,
      subscriptionStatus: 'active',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      uuid: 'uuid2',
      username: 'user2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '987-654-3210',
      signupDate: new Date('2023-02-01T00:00:00Z'),
      mailOptIn: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedEmail: false,
      subscriptionStatus: 'inactive',
    },
  });

  // Create sample households
  const household1 = await prisma.household.create({
    data: {
      householdId: 'household1',
      householdName: 'Doe Family',
      creationDate: new Date('2023-01-01T00:00:00Z'),
      customHouseholdNameSuchAsCrew: 'Doe Crew',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: 'doe_account',
      setupComplete: true,
      activeSubscription: true,
      users: { connect: [{ uuid: 'uuid1' }] },
    },
  });

  const household2 = await prisma.household.create({
    data: {
      householdId: 'household2',
      householdName: 'Smith Family',
      creationDate: new Date('2023-02-01T00:00:00Z'),
      customHouseholdNameSuchAsCrew: 'Smith Crew',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: 'smith_account',
      setupComplete: false,
      activeSubscription: false,
      users: { connect: [{ uuid: 'uuid2' }] },
    },
  });

  // Create sample household members
  await prisma.householdMembers.create({
    data: {
      householdId: 'household1',
      memberUuid: 'uuid1',
      role: 'admin',
      joinedDate: new Date('2023-01-01T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.householdMembers.create({
    data: {
      householdId: 'household2',
      memberUuid: 'uuid2',
      role: 'member',
      joinedDate: new Date('2023-02-01T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create sample incomes
  await prisma.incomes.create({
    data: {
      incomeId: 'income1',
      householdId: 'household1',
      name: 'Salary',
      amount: 5000,
      frequency: 'monthly',
      firstPayDay: new Date('2023-01-15T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create sample ledger entries
  await prisma.ledger.create({
    data: {
      ledgerId: 'ledger1',
      householdId: 'household1',
      paymentSourceId: 'source1',
      amount: 1000,
      transactionType: 'expense',
      transactionDate: new Date('2023-01-15T00:00:00Z'),
      category: 'Groceries',
      description: 'Weekly grocery shopping',
      status: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'uuid1',
      runningTotal: 1000,
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
