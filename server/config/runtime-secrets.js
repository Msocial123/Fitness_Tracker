const {
  GetSecretValueCommand,
  SecretsManagerClient
} = require('@aws-sdk/client-secrets-manager');

let loadPromise;

const parseSecret = (secretString, key) => {
  if (!secretString) {
    throw new Error(`${key} secret contains no SecretString`);
  }

  if (secretString.trim().startsWith('{')) {
    const parsed = JSON.parse(secretString);
    if (!parsed[key]) {
      throw new Error(`${key} secret JSON must contain ${key}`);
    }
    return parsed[key];
  }

  return secretString;
};

const loadRuntimeSecrets = async () => {
  if (process.env.JWT_SECRET) {
    return;
  }

  if (!process.env.JWT_SECRET_ARN) {
    throw new Error('JWT_SECRET_ARN is required in production');
  }

  if (!loadPromise) {
    const client = new SecretsManagerClient({});
    loadPromise = client.send(new GetSecretValueCommand({
      SecretId: process.env.JWT_SECRET_ARN
    })).then(({ SecretString }) => {
      process.env.JWT_SECRET = parseSecret(SecretString, 'JWT_SECRET');
      if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters');
      }
    });
  }

  return loadPromise;
};

module.exports = { loadRuntimeSecrets, parseSecret };
