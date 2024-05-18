const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { familyId, page = 1, limit = 10 } = body;

    if (!familyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing familyId parameter" }),
      };
    }

    if (typeof familyId !== "string" || familyId.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid familyId parameter" }),
      };
    }

    const sanitizedFamilyId = familyId.trim();
    const offset = (page - 1) * limit;

    const familyExists = await prisma.family.findUnique({
      where: { familyId: sanitizedFamilyId },
    });

    if (!familyExists) {
      console.log(`Error: Family ${sanitizedFamilyId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Family not found" }),
      };
    }

    const transactions = await prisma.transactionLedger.findMany({
      where: { familyId: sanitizedFamilyId },
      include: { attachments: true },
      skip: offset,
      take: limit,
    });

    const totalTransactions = await prisma.transactionLedger.count({
      where: { familyId: sanitizedFamilyId },
    });

    const totalPages = Math.ceil(totalTransactions / limit);

    return {
      statusCode: 200,
      body: JSON.stringify({
        page,
        limit,
        totalPages,
        totalTransactions,
        transactions,
      }),
    };
  } catch (error) {
    console.error(`Error retrieving transactions: ${error.message}`, {
      errorDetails: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
