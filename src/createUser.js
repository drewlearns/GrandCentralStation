const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { username, email, password, phoneNumber, firstName, lastName } = JSON.parse(event.body);

  try {
    // Create a new user using Prisma Client
    const newUser = await prisma.user.create({
      data: {
        userId: username,
        email,
        phoneNumber,
        firstName,
        lastName,
        createdAt: new Date(),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User registered successfully", user: newUser }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Error in SignUp or DB operation:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to register user",
        errorDetails: error.message,
      }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
