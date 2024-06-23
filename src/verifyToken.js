const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Google public keys URL
const GOOGLE_KEYS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Cache for public keys
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

exports.handler = async (event) => {
  const token = event.headers.Authorization.split(' ')[1];

  try {
    const keys = await getGooglePublicKeys();
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const kid = decodedHeader.header.kid;
    const publicKey = keys[kid];

    if (!publicKey) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const decodedToken = jwt.verify(token, publicKey);

    // Optional: Additional validation can be added here (e.g., checking issuer, audience)

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Token is valid', decodedToken }),
    };
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token', error: err.message }),
    };
  }
};
