const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error getting signing key:', err);
      callback(err, null);
      return;
    }

    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

exports.handler = async (event) => {
  const token = event.authorizationToken;

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Access denied. No token provided.' }),
    };
  }

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
          console.error('Token verification error:', err);
          reject(new Error('Invalid token.'));
        } else {
          resolve(decoded);
        }
      });
    });

    // Assuming 'expires_in' is passed as part of the token payload and is in seconds
    const expiresIn = decoded.expires_in || 3600; // Default to 3600 seconds if not provided
    const issuedAt = decoded.iat; // Issued at timestamp in seconds
    const expirationTime = issuedAt + expiresIn;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (currentTimestamp > expirationTime) {
      console.error('Token expired:', decoded);
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Token expired.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ username: decoded.username }),
    };
  } catch (err) {
    console.error('Token verification failed:', err);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: err.message || 'Invalid token.' }),
    };
  }
};
