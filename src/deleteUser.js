const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const GOOGLE_KEYS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedKeys = null;

async function getGooglePublicKeys() {
  if (!cachedKeys) {
    const response = await fetch(GOOGLE_KEYS_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch Google public keys');
    }
    cachedKeys = await response.json();
  }
  return cachedKeys;
}

async function verifyToken(token) {
  try {
    const keys = await getGooglePublicKeys();
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader) {
      throw new Error('Invalid token');
    }

    const kid = decodedHeader.header.kid;
    const publicKey = keys[kid];

    if (!publicKey) {
      throw new Error('Invalid token');
    }

    const decodedToken = jwt.verify(token, publicKey);

    // Optional: Additional validation can be added here (e.g., checking issuer, audience)

    return decodedToken;
  } catch (err) {
    throw new Error('Invalid token');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { authorizationToken } = body;

    if (!authorizationToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Access denied. No token provided.' })
      };
    }

    // Verify the token and get the decoded token
    const decodedToken = await verifyToken(authorizationToken);
    const userUuid = decodedToken.uid; // Assuming the token contains a field 'uid' for the user's UUID

    // Validate that the user exists
    const user = await prisma.user.findUnique({ where: { uuid: userUuid } });
    if (!user) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "User not found" }) };

    // Delete the user and related data
    await prisma.user.delete({ where: { uuid: userUuid } });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "User deleted successfully" })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error processing request", error: error.message })
    };
  } finally {
    await prisma.$disconnect();
  }
};
