const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;
const BCRYPT_PREFIX = /^\$2[aby]\$/;

const isPasswordHash = (value) => typeof value === 'string' && BCRYPT_PREFIX.test(value);

const hashPassword = async (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

const verifyPassword = async (password, storedPassword) => {
  if (typeof password !== 'string' || typeof storedPassword !== 'string') {
    return { valid: false, needsUpgrade: false };
  }

  if (isPasswordHash(storedPassword)) {
    return {
      valid: await bcrypt.compare(password, storedPassword),
      needsUpgrade: false
    };
  }

  // Transitional support for existing MongoDB records. A successful login
  // immediately replaces the legacy plaintext value with a bcrypt hash.
  return {
    valid: password === storedPassword,
    needsUpgrade: password === storedPassword
  };
};

module.exports = {
  hashPassword,
  isPasswordHash,
  verifyPassword
};
