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

    if (!key) {
      console.error('Signing key not found');
      callback(new Error('Signing key not found'), null);
      return;
    }

    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

exports.handler = async (event) => {
  const token = event.authorizationToken;

  if (!token) {
    throw new Error('Access denied. No token provided.');
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        console.error('Token verification error:', err);
        reject('Invalid token.');
      } else {
        console.log('Token verified successfully:', decoded);
        if (!decoded.username) {
          console.error('UUID not found in token:', decoded);
          reject('Token does not contain a valid UUID.');
        } else {
          resolve(decoded);
        }
      }
    });
  });
};
