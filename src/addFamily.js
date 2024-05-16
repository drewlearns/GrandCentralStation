const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios"); // Import axios for HTTP requests

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { familyName, createdBy, customFamilyName, account } = JSON.parse(
    event.body
  );
  const familyId = uuidv4(); // Unique ID for the family

  try {
    // Check if the user with createdBy exists in the User table
    const userExists = await prisma.user.findUnique({
      where: { uuid: createdBy },
    });

    if (!userExists) {
      console.log(`Error: User ${createdBy} does not exist`);
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "User not found",
        }),
      };
    }

    // Check if the family with the same familyName and createdBy already exists
    const familyExists = await prisma.family.findFirst({
      where: {
        familyName: familyName,
        members: {
          some: {
            memberUuid: createdBy,
            role: "creator",
          },
        },
      },
    });

    if (familyExists) {
      console.log(
        `Error: Family with name ${familyName} already exists for user ${createdBy}`
      );
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: "Family already exists",
        }),
      };
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Create the family record
      const family = await prisma.family.create({
        data: {
          familyId: familyId,
          familyName: familyName,
          customFamilyNameSuchAsCrew: customFamilyName,
          creationDate: new Date(),
          createdAt: new Date(), // Set createdAt for Family
          updatedAt: new Date(), // Set updatedAt for Family
          account: account,
          setupComplete: false,
          activeSubscription: false,
          members: {
            create: [
              {
                id: uuidv4(), // Ensure a unique ID for FamilyMembers
                memberUuid: createdBy,
                role: "creator",
                joinedDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        },
      });

      // Check if an initial dummy ledger already exists for the family
      const existingInitialLedger = await prisma.transactionLedger.findFirst({
        where: {
          familyId: familyId,
          transactionType: "Initialization",
        },
      });

      if (!existingInitialLedger) {
        // Create an initial dummy ledger for the family
        await prisma.transactionLedger.create({
          data: {
            transactionId: uuidv4(),
            familyId: familyId,
            amount: 0.0, // Zero dollars to indicate no initial transaction
            runningTotal: 0.0, // Initialize the running total as well
            transactionType: "Initialization", // Descriptive type for the initial ledger
            transactionDate: new Date(),
            category: "Initial Setup", // A category for initial setup
            description: "Initially created ledger", // Descriptive label for this entry
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: createdBy, // This should be adjusted to the user who initiates the setup
          },
        });
      }

      return family;
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Family created successfully",
        familyId: familyId,
        familyName: familyName,
        customFamilyName: customFamilyName,
        account: account,
      }),
    };
  } catch (error) {
    console.error("Error creating family:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Error creating family",
        error: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
