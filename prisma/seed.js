const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.attachments.deleteMany();
  await prisma.ledger.deleteMany();
  await prisma.incomes.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.paymentSource.deleteMany();
  await prisma.householdMembers.deleteMany();
  await prisma.preferences.deleteMany();
  await prisma.invitations.deleteMany();
  await prisma.household.deleteMany();
  await prisma.auditTrail.deleteMany();
  await prisma.securityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.token.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const users = [];
  for (let i = 1; i <= 4; i++) {
    const user = await prisma.user.create({
      data: {
        uuid: uuidv4(),
        username: `user${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        phoneNumber: `123-456-789${i}`,
        signupDate: new Date(),
        mailOptIn: i % 2 === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedEmail: i % 2 === 0
      }
    });
    users.push(user);
  }

  // Create Households
  const households = [];
  for (let i = 1; i <= 2; i++) {
    const household = await prisma.household.create({
      data: {
        householdId: uuidv4(),
        householdName: `Household${i}`,
        creationDate: new Date(),
        customHouseholdNameSuchAsCrew: `Crew${i}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        account: `Account${i}`,
        setupComplete: true,
        activeSubscription: i % 2 === 0
      }
    });
    households.push(household);
  }

  // Create Household Members
  for (const household of households) {
    for (const user of users) {
      await prisma.householdMembers.create({
        data: {
          id: uuidv4(),
          householdId: household.householdId,
          memberUuid: user.uuid,
          role: 'member',
          joinedDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  // Create Incomes
  for (const household of households) {
    for (let i = 1; i <= 2; i++) {
      await prisma.incomes.create({
        data: {
          incomeId: uuidv4(),
          householdId: household.householdId,
          name: `Income${i}`,
          amount: 1000 * i,
          frequency: 'monthly',
          firstPayDay: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  // Create Bills
  const bills = [];
  for (const household of households) {
    for (let i = 1; i <= 12; i++) {
      const bill = await prisma.bill.create({
        data: {
          billId: uuidv4(),
          householdId: household.householdId,
          category: `Category${i}`,
          billName: `Bill${i}`,
          amount: 100 * i,
          dayOfMonth: i,
          frequency: 'monthly',
          isDebt: i % 2 === 0,
          interestRate: i % 2 === 0 ? 0.05 : null,
          cashBack: i % 2 === 0 ? 10 : null,
          description: `Description for Bill${i}`,
          status: 'pending',
          url: `http://example.com/bill${i}`,
          username: `user${i}`,
          password: `password${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          notificationId: null
        }
      });
      bills.push(bill);
    }
  }

  // Create Payment Sources
  for (const household of households) {
    for (let i = 1; i <= 2; i++) {
      await prisma.paymentSource.create({
        data: {
          sourceId: uuidv4(),
          householdId: household.householdId,
          sourceName: `PaymentSource${i}`,
          sourceType: i % 2 === 0 ? 'credit_card' : 'bank_account',
          details: `Details for PaymentSource${i}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  // Create Ledger Entries and Transactions
  for (const household of households) {
    for (let i = 1; i <= 6; i++) {
      const ledger = await prisma.ledger.create({
        data: {
          ledgerId: uuidv4(),
          householdId: household.householdId,
          amount: 100 * i,
          transactionType: 'expense',
          transactionDate: new Date(2023, i - 1, 1),
          category: `Category${i}`,
          description: `Description for Ledger${i}`,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: users[i % 4].uuid,
          billId: null,
          incomeId: null,
          runningTotal: 1000 - (100 * i),
          interestRate: null,
          cashBack: null
        }
      });

      // Create Transactions for Ledger Entries
      for (let j = 1; j <= 2; j++) {
        await prisma.transaction.create({
          data: {
            transactionId: uuidv4(),
            ledgerId: ledger.ledgerId,
            sourceId: household.paymentSources[j % 2].sourceId,
            amount: 100 * i,
            transactionDate: new Date(2023, i - 1, j),
            description: `Description for Transaction${j} of Ledger${i}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
  }

  // Create Notifications for Bills
  for (const bill of bills) {
    const notification = await prisma.notification.create({
      data: {
        notificationId: uuidv4(),
        userUuid: users[0].uuid,
        billId: bill.billId,
        title: `Notification for ${bill.billName}`,
        message: `Your bill ${bill.billName} is due soon.`,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update bill with notificationId
    await prisma.bill.update({
      where: { billId: bill.billId },
      data: { notificationId: notification.notificationId }
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
