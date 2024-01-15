// generateRandomString.js
const randomString = require('crypto').randomBytes(64).toString('hex');
console.log(randomString);
