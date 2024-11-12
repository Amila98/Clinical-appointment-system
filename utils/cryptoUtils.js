const crypto = require('crypto');

// Define a salt (store it securely)
const SALT = 'yourUniqueSalt';
const ITERATIONS = 100000; // Number of iterations
const KEY_LENGTH = 32; // Key length for AES-256

// Function to derive the encryption key
const deriveKey = (secret) => {
  return crypto.pbkdf2Sync(secret, SALT, ITERATIONS, KEY_LENGTH, 'sha512');
};

const ENCRYPTION_KEY = deriveKey(process.env.ENCRYPTION_SECRET);
const IV_LENGTH = 16; // AES block size

// Function to encrypt data (like tokens)
exports.encryptToken = (data) => {
  const iv = crypto.randomBytes(IV_LENGTH); // Create an initialization vector (IV)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Combine the IV and encrypted data (needed for decryption)
  return `${iv.toString('hex')}:${encrypted}`;
};

// Function to decrypt data (tokens)
exports.decryptToken = (encryptedData) => {
  const [ivString, encryptedText] = encryptedData.split(':'); // Split IV and encrypted data
  const iv = Buffer.from(ivString, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  try {
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
  } catch (err) {
      throw new Error('Decryption failed');
  }
};


// Function to generate the hash value
const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
    const formattedAmount = parseFloat(amount).toFixed(2);
    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hash = crypto.createHash('md5').update(`${merchantId}${orderId}${formattedAmount}${currency}${secretHash}`).digest('hex').toUpperCase();
    return hash;
};


