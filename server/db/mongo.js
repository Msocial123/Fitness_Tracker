const mongoose = require('mongoose');
const {
  GetSecretValueCommand,
  SecretsManagerClient
} = require('@aws-sdk/client-secrets-manager');
const { logger } = require('../datadog');

let connectionPromise;
let mongoUriPromise;
let secretsClient;

const parseMongoSecret = (secretString) => {
  if (!secretString) {
    throw new Error('MongoDB secret contains no SecretString');
  }

  if (secretString.trim().startsWith('{')) {
    const parsed = JSON.parse(secretString);
    if (!parsed.MONGODB_URI) {
      throw new Error('MongoDB secret JSON must contain MONGODB_URI');
    }
    return parsed.MONGODB_URI;
  }

  return secretString;
};

const getMongoUri = async () => {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  if (process.env.MONGODB_SECRET_ARN) {
    if (!mongoUriPromise) {
      secretsClient ||= new SecretsManagerClient({});
      mongoUriPromise = secretsClient.send(new GetSecretValueCommand({
        SecretId: process.env.MONGODB_SECRET_ARN
      })).then(({ SecretString }) => parseMongoSecret(SecretString));
    }
    return mongoUriPromise;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_SECRET_ARN is required for the transitional production backend');
  }

  return 'mongodb://localhost:27017/fitness-tracker';
};

const redactMongoUri = (uri) => uri.replace(/\/\/[^@/]+@/, '//***:***@');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    const uri = await getMongoUri();
    connectionPromise = mongoose.connect(uri)
      .then(({ connection }) => {
        logger.info('Database connection established', {
          host: connection.host,
          database: connection.name,
          action: 'mongodb_connected'
        });
        return connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        logger.error('Database connection failed', {
          message: error.message,
          mongoUri: redactMongoUri(uri),
          action: 'mongodb_connection_failed'
        });
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = {
  connectDB,
  getMongoUri,
  parseMongoSecret,
  redactMongoUri
};
