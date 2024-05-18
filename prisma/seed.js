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
    const signupDate = new Date();
    const user = await prisma.user.create({
      data: {
        uuid: uuidv4(),
        username: `user${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        phoneNumber: `123-456-789${i}`,
        signupDate: signupDate,
        mailOptIn: i % 2 === 0,
        createdAt: signupDate,
        updatedAt: signupDate,
        confirmedEmail: i % 2 === 0,
        subscriptionEndDate: new Date(signupDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days later
        subscriptionStatus: 'trial', // Set to trial initially
        subscriptionId: `sub_${uuidv4()}`, // Placeholder for subscription ID
        purchaseToken: `token_${uuidv4()}`, // Placeholder for purchase token
        receiptData: `receipt_${uuidv4()}`, // Placeholder for receipt data
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
          notificationNotificationId: null
        }
      });
      bills.push(bill);
    }
  }

  // Create Payment Sources
  const paymentSources = [];
  for (const household of households) {
    for (let i = 1; i <= 2; i++) {
      const paymentSource = await prisma.paymentSource.create({
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
      paymentSources.push(paymentSource);
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
          billId: bills[i % bills.length].billId,
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
            sourceId: paymentSources[j % paymentSources.length].sourceId,
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

    // Update bill with notificationNotificationId
    await prisma.bill.update({
      where: { billId: bill.billId },
      data: { notificationNotificationId: notification.notificationId }
    });
  }

  // Create Tokens for Users (for example purposes)
  for (const user of users) {
    await prisma.token.create({
      data: {
        tokenId: uuidv4(),
        userUuid: user.uuid,
        accessToken: `access_token_${uuidv4()}`,
        refreshToken: `refresh_token_${uuidv4()}`,
        idToken: `id_token_${uuidv4()}`,
        issuedAt: new Date(),
        expiresIn: 3600, // Example expiry time
        token: `id_token_${uuidv4()}`, // Example token
        type: 'access', // Example type
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
