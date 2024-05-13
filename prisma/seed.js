const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Create Users
    const user1 = await prisma.user.create({
        data: {
            uuid: "user1-uuid",
            username: "johndoe",
            firstName: "John",
            lastName: "Doe",
            email: "johndoe@example.com",
            phoneNumber: "123-456-7890",
            signupDate: new Date(),
            mailOptIn: true,
            confirmedEmail: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create Families
    const family1 = await prisma.family.create({
        data: {
            familyId: "family1-uuid",
            familyName: "Doe Family",
            creationDate: new Date(),
            customFamilyNameSuchAsCrew: "The Does",
            createdAt: new Date(),
            updatedAt: new Date(),
            account: "DoeAccount",
            setupComplete: true,
            activeSubscription: true,
        },
    });

    // Create FamilyMembers
    const familyMember1 = await prisma.familyMembers.create({
        data: {
            familyId: family1.familyId,
            memberUuid: user1.uuid,
            role: "Parent",
            joinedDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create Incomes
    const income1 = await prisma.incomes.create({
        data: {
            incomeId: "income1-uuid",
            familyId: family1.familyId,
            name: "Monthly Salary",
            amount: 5000,
            frequency: "monthly",
            firstPayDay: "2024-01-15",
            createdAt: new Date(),
            updatedAt: new Date()
        },
    });

    // Create TransactionLedger
    const transaction1 = await prisma.transactionLedger.create({
        data: {
            transactionId: "transaction1-uuid",
            familyId: family1.familyId,
            amount: 150.00,
            transactionType: "Expense",
            transactionDate: new Date(),
            category: "Groceries",
            description: "Weekly groceries",
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: user1.uuid,
        },
    });

    // Create Calendar Events
    const calendar1 = await prisma.calendar.create({
        data: {
            dateId: 1,
            familyId: family1.familyId,
            eventName: "Family Reunion",
            eventDate: new Date("2024-05-20"),
            description: "Annual family reunion picnic",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create BillTable Entries
    const bill1 = await prisma.billTable.create({
        data: {
            billId: "bill1-uuid",
            familyId: family1.familyId,
            category: "Utilities",
            billName: "Electric Bill",
            amount: 120.75,
            dayOfMonth: 15,
            frequency: "monthly",
            isDebt: false,
            interestRate: 0,
            totalDebt: 0,
            description: "Monthly electric bill",
            status: "unpaid",
            url: "http://utilities.example.com",
            username: "user",
            password: "pass",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create Preferences
    const preference1 = await prisma.preferences.create({
        data: {
            preferenceId: "preference1-uuid",
            familyId: family1.familyId,
            preferenceType: "Theme",
            preferenceValue: "Dark Mode",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create Invitations
    const invitation1 = await prisma.invitations.create({
        data: {
            invitationId: "invitation1-uuid",
            familyId: family1.familyId,
            invitedUserUuid: user1.uuid,
            invitationStatus: "pending",
            sentDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create AuditTrail
    const audit1 = await prisma.auditTrail.create({
        data: {
            auditId: "audit1-uuid",
            tableAffected: "User",
            actionType: "Update",
            oldValue: "",
            newValue: "Updated email",
            changedBy: user1.uuid,
            changeDate: new Date(),
            timestamp: new Date(),
            device: "Laptop",
            ipAddress: "192.168.1.1",
            deviceType: "Windows Laptop",
            ssoEnabled: "Yes",
        },
    });

    // Create Attachments
    const attachment1 = await prisma.attachments.create({
        data: {
            attachmentId: "attachment1-uuid",
            transactionId: transaction1.transactionId,
            fileType: "pdf",
            filePath: "invoice-may.pdf",
            uploadDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create Categories
    const category1 = await prisma.categories.create({
        data: {
            category_id: "category1-uuid",
            familyId: family1.familyId,
            name: "Household",
            budgetLimit: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    // Create SecurityLog
    const securityLog1 = await prisma.securityLog.create({
        data: {
            logId: "securityLog1-uuid",
            userUuid: user1.uuid,
            loginTime: new Date(),
            ipAddress: "192.168.1.100",
            deviceDetails: "MacBook Pro",
            locationDetails: "Home",
            actionType: "Login",
            createdAt: new Date(),
        },
    });

    // Create Notification
    const notification1 = await prisma.notification.create({
        data: {
            notificationId: "notification1-uuid",
            userUuid: user1.uuid,
            title: "Welcome to the Family App",
            message: "You have been successfully added to the Doe Family.",
            read: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('Seeding completed.');
    })
    .catch(async (e) => {
        console.error('Error during seeding:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
