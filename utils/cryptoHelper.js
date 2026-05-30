const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = Buffer.from(process.env.CRYPTO_SECRET || 'f84df948ab32bc9d021f92e8bc1d2e9c3e9812bc837d9cdfa4ad45c083652db7', 'hex');
const IV_LENGTH = 16; // AES block size

const encrypt = (text) => {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
};

const decrypt = (encryptedText) => {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedTextBuffer = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedTextBuffer, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // If decryption fails, it might be unencrypted plain text from database seeding/pre-existing data
    return encryptedText;
  }
};

module.exports = {
  encrypt,
  decrypt
};
