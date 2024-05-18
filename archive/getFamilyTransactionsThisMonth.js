const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const familyId = body.familyId;
  const page = parseInt(body.page) || 1;
  const limit = parseInt(body.limit) || 10;

  if (!familyId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing familyId parameter" }),
    };
  }

  const offset = (page - 1) * limit;
  const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  try {
    const familyExists = await prisma.family.findUnique({
      where: { familyId: familyId },
    });

    if (!familyExists) {
      console.log(`Error: Family ${familyId} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Family not found" }),
      };
    }

    const transactions = await prisma.transactionLedger.findMany({
      where: {
        familyId: familyId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { attachments: true },
      skip: offset,
      take: limit,
    });

    const totalTransactions = await prisma.transactionLedger.count({
      where: {
        familyId: familyId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
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
