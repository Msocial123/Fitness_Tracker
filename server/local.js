require('dotenv').config();

const app = require('./app');
const { logger } = require('./datadog');
const { connectDB, getMongoUri, redactMongoUri } = require('./db/mongo');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const start = async () => {
  await connectDB();
  const mongoUri = await getMongoUri();
  app.listen(PORT, HOST, () => {
    logger.info('Server started successfully', {
      host: HOST,
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      database: redactMongoUri(mongoUri),
      action: 'server_started'
    });
  });
};

start().catch((error) => {
  logger.error('Server startup failed', {
    message: error.message,
    action: 'server_startup_failed'
  });
  process.exitCode = 1;
});
