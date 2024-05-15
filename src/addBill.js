const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');  // Import UUID library to generate unique IDs

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
    } = JSON.parse(event.body);  // Expecting all these fields in the request body

    try {
        // Check if the family exists
        const familyExists = await prisma.family.findUnique({
            where: { familyId: familyId },
        });

        if (!familyExists) {
            console.log(`Error: Family ${familyId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Family not found',
                }),
            };
        }

        // Generate a unique billId for the new bill
        const billId = uuidv4();

        // Create the new bill in the BillTable
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

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bill successfully added to the family',
                bill: newBill
            }),
        };
    } catch (error) {
        console.error(`Error adding bill to family ${familyId}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error adding bill to the family',
                error: error.message,
                details: error.meta && error.meta.target ? `Failed on fields: ${error.meta.target.join(', ')}` : 'No additional details',
            }),
        };
    }
};
