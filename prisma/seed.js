const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Seeding User Data
  const user = await prisma.user.create({
    data: {
      uuid: "1",
      username: "john_doe",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phoneNumber: "123-456-7890",
      signupDate: new Date(),
      mailOptIn: true,
      confirmedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seeding Family Data
  const family = await prisma.family.create({
    data: {
      familyId: "1",
      familyName: "Doe Family",
      creationDate: new Date(),
      customFamilyNameSuchAsCrew: "Doe Crew",
      createdAt: new Date(),
      updatedAt: new Date(),
      account: "DoeAccount",
      setupComplete: true,
      activeSubscription: true,
    },
  });

  // Seeding FamilyMembers Data
  const familyMember = await prisma.familyMembers.create({
    data: {
      familyId: family.familyId,
      memberUuid: user.uuid,
      role: "Head",
      joinedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seeding Incomes Data
  const income = await prisma.incomes.create({
    data: {
      incomeId: "1",
      familyId: family.familyId,
      name: "Doe's Main Income",
      amount: 5000,
      frequency: "monthly",
      firstPayDay: "2024-06-15",
    },
  });

  // Seeding TransactionLedger Data
  const transaction = await prisma.transactionLedger.create({
    data: {
      transactionId: "1",
      familyId: family.familyId,
      amount: 150.50,
      transactionType: "Grocery",
      transactionDate: new Date(),
      category: "Food",
      description: "Weekly grocery shopping",
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: user.uuid,
    },
  });

  // Seeding Calendar Data
  const calendar = await prisma.calendar.create({
    data: {
      dateId: 1,
      familyId: family.familyId,
      eventName: "John's Birthday",
      eventDate: new Date(2024, 6, 12),
      description: "Birthday party at home",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seeding BillTable Data
  const bill = await prisma.billTable.create({
    data: {
      billId: "1",
      familyId: family.familyId,
      category: "Utilities",
      billName: "Electricity Bill",
      amount: 200.00,
      dayOfMonth: 15,
      frequency: "monthly",
      isDebt: false,
      interestRate: 0.0,
      totalDebt: 0,
      description: "Monthly electricity payment",
      status: "due",
      url: "http://utilityprovider.com",
      username: "john_doe",
      password: "secure_password",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seeding Preferences Data
  const preference = await prisma.preferences.create({
    data: {
      preferenceId: "1",
      familyId: family.familyId,
      preferenceType: "Theme",
      preferenceValue: "Dark",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });


  // Seeding Invitations Data
  const invitation = await prisma.invitations.create({
    data: {
      invitationId: "1",
      familyId: family.familyId,
      invitedUserUuid: user.uuid,
      invitationStatus: "pending",
      sentDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seeding AuditTrail Data
  const auditTrail = await prisma.auditTrail.create({
    data: {
      auditId: "1",
      tableAffected: "User",
      actionType: "Create",
      oldValue: "",
      newValue: JSON.stringify(user),
      changedBy: user.uuid,
      changeDate: new Date(),
      timestamp: new Date(),
      device: "Laptop",
      ipAddress: "192.168.1.100",
      deviceType: "Windows Laptop",
      ssoEnabled: "Yes",
    },
  });

  // Seeding Attachments Data
  const attachment = await prisma.attachments.create({
    data: {
      attachmentId: "1",
      transactionId: transaction.transactionId,
      fileType: "pdf",
      filePath: "/path/to/receipt.pdf",
      uploadDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seeding Categories Data
  const category = await prisma.categories.create({
    data: {
      category_id: "1",
      familyId: family.familyId,
      name: "Entertainment",
      budgetLimit: 300,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
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
