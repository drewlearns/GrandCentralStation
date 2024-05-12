const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.handler = async (event) => {
  const { username, email, mailOptIn, phoneNumber, firstName, lastName } = JSON.parse(event.body);
  const mailOptInValue = mailOptIn === "true"; // Converts "true" to true and any other string to false

  try {
    const newUser = await prisma.user.create({
      data: {
        uuid: username,
        username,
        email,
        phoneNumber,
        firstName,
        lastName,
        createdAt: new Date(),
        signupDate: new Date(),
        updatedAt: new Date(),
        confirmed_email: false,
        mailOptIn: mailOptInValue,
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
