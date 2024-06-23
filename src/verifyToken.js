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
  console.log('Event:', JSON.stringify(event, null, 2)); // Log the incoming event

  let token;
  try {
    token = event.authToken; // Directly access authToken
    console.log('Token:', token); // Log the extracted token
  } catch (err) {
    console.error('Invalid request body:', err.message); // Log the error
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request body', error: err.message }),
    };
  }

  if (!token) {
    console.error('Authorization token is missing'); // Log the missing token error
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Authorization token is missing' }),
    };
  }

  try {
    const keys = await getGooglePublicKeys();
    const decodedHeader = jwt.decode(token, { complete: true });

    console.log('Decoded Header:', JSON.stringify(decodedHeader, null, 2)); // Log the decoded header

    if (!decodedHeader) {
      console.error('Invalid token: Unable to decode header'); // Log the invalid token error
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const kid = decodedHeader.header.kid;
    const publicKey = keys[kid];

    if (!publicKey) {
      console.error('Invalid token: Public key not found'); // Log the missing public key error
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const decodedToken = jwt.verify(token, publicKey);

    console.log('Decoded Token:', JSON.stringify(decodedToken, null, 2)); // Log the decoded token

    if (decodedToken && decodedToken.user_id) {
      return {
        statusCode: 200,
        body: JSON.stringify(decodedToken), // Return the entire payload
      };
    } else {
      console.error('user_id not found in token'); // Log the missing user_id error
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'user_id not found in token' }),
      };
    }
  } catch (err) {
    console.error('Token verification error:', err.message); // Log the verification error
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token', error: err.message }),
    };
  }
};
