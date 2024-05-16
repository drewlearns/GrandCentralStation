const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const updateCalendar = require('../src/updateCalendar');
const prisma = new PrismaClient();

async function main() {
    function getMonthlyDates() {
        const dates = [];
        for (let month = 0; month < 12; month++) {
            dates.push(new Date(2024, month, 15));
        }
        return dates;
    }

    const users = [];
    for (let i = 1; i <= 3; i++) {
        users.push(await prisma.user.create({
            data: {
                uuid: uuidv4(),
                username: `user${i}`,
                firstName: `FirstName${i}`,
                lastName: `LastName${i}`,
                email: `user${i}@example.com`,
                phoneNumber: `123-456-78${90 + i}`,
                signupDate: new Date(),
                mailOptIn: true,
                confirmedEmail: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        }));
    }

    const families = [];
    for (let i = 1; i <= 2; i++) {
        families.push(await prisma.family.create({
            data: {
                familyId: uuidv4(),
                familyName: `Family${i}`,
                creationDate: new Date(),
                customFamilyNameSuchAsCrew: `The Family${i}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                account: `Family${i}Account`,
                setupComplete: true,
                activeSubscription: true,
            },
        }));
    }

    const familyMembers = [];
    for (let i = 0; i < users.length; i++) {
        familyMembers.push(await prisma.familyMembers.create({
            data: {
                familyId: families[i % families.length].familyId,
                memberUuid: users[i].uuid,
                role: "Parent",
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        }));
    }

    const monthlyDates = getMonthlyDates();
    const transactions = [];
    for (let i = 0; i < monthlyDates.length; i++) {
        for (let j = 0; j < families.length; j++) {
            transactions.push(await prisma.transactionLedger.create({
                data: {
                    transactionId: uuidv4(),
                    familyId: families[j].familyId,
                    amount: 100 + (i * 10),
                    transactionType: "Expense",
                    transactionDate: monthlyDates[i],
                    category: "Groceries",
                    description: `Groceries for ${monthlyDates[i].toLocaleString('default', { month: 'long' })}`,
                    createdAt: monthlyDates[i],
                    updatedAt: monthlyDates[i],
                    updatedBy: users[j % users.length].uuid,
                    runningTotal: 0,
                }
            }));
        }
    }

    const incomes = await prisma.incomes.create({
        data: {
            incomeId: uuidv4(),
            familyId: families[0].familyId,
            name: "Monthly Salary",
            amount: 5000,
            frequency: "monthly",
            firstPayDay: "2024-01-15",
            createdAt: new Date(),
            updatedAt: new Date()
        },
    });

    const bills = await prisma.billTable.create({
        data: {
            billId: uuidv4(),
            familyId: families[0].familyId,
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

    // Create Calendar entries for each transaction, income, and bill
    let dateIdCounter = 1;  // Counter for dateId
    for (const transaction of transactions) {
        await prisma.calendar.create({
            data: {
                eventName: 'Financial Update',
                eventDate: transaction.transactionDate,
                description: transaction.description,
                transactionId: transaction.transactionId,
                familyId: transaction.familyId,
                dateId: dateIdCounter++,  // Use counter for unique integer dateId
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    for (let i = 0; i < 12; i++) {
        await prisma.calendar.create({
            data: {
                eventName: "Income - Monthly Salary",
                eventDate: new Date(2024, i, 15),
                description: "Monthly Salary Income",
                familyId: incomes.familyId,
                dateId: dateIdCounter++,  // Use counter for unique integer dateId
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    for (let i = 0; i < 12; i++) {
        await prisma.calendar.create({
            data: {
                eventName: "Bill - Electric Bill",
                eventDate: new Date(2024, i, 15),
                description: "Monthly Electric Bill",
                familyId: bills.familyId,
                dateId: dateIdCounter++,  // Use counter for unique integer dateId
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    await prisma.calendar.create({
        data: {
            eventName: "Family Reunion",
            eventDate: new Date("2024-05-20"),
            description: "Annual family reunion picnic",
            familyId: families[0].familyId,
            dateId: dateIdCounter++,  // Use counter for unique integer dateId
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    await prisma.preferences.create({
        data: {
            preferenceId: uuidv4(),
            familyId: families[0].familyId,
            preferenceType: "Theme",
            preferenceValue: "Dark Mode",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    await prisma.invitations.create({
        data: {
            invitationId: uuidv4(),
            familyId: families[0].familyId,
            invitedUserUuid: users[0].uuid,
            invitationStatus: "pending",
            sentDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    await prisma.auditTrail.create({
        data: {
            auditId: uuidv4(),
            tableAffected: "User",
            actionType: "Update",
            oldValue: "",
            newValue: "Updated email",
            changedBy: users[0].uuid,
            changeDate: new Date(),
            timestamp: new Date(),
            device: "Laptop",
            ipAddress: "192.168.1.1",
            deviceType: "Windows Laptop",
            ssoEnabled: "Yes",
        },
    });

    await prisma.attachments.create({
        data: {
            attachmentId: uuidv4(),
            transactionId: transactions[0].transactionId,
            fileType: "pdf",
            filePath: "invoice-may.pdf",
            uploadDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    await prisma.categories.create({
        data: {
            category_id: uuidv4(),
            familyId: families[0].familyId,
            name: "Household",
            budgetLimit: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    await prisma.securityLog.create({
        data: {
            logId: uuidv4(),
            userUuid: users[0].uuid,
            loginTime: new Date(),
            ipAddress: "192.168.1.100",
            deviceDetails: "MacBook Pro",
            locationDetails: "Home",
            actionType: "Login",
            createdAt: new Date(),
        },
    });

    await prisma.notification.create({
        data: {
            notificationId: uuidv4(),
            userUuid: users[0].uuid,
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
        console.log('Seeding and calendar update completed.');
    })
    .catch(async (e) => {
        console.error('Error during seeding:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
