const serverless = require('serverless-http');
const { loadRuntimeSecrets } = require('./config/runtime-secrets');

let proxyPromise;

const getProxy = async () => {
  if (!proxyPromise) {
    proxyPromise = loadRuntimeSecrets().then(() => serverless(require('./app')));
  }
  return proxyPromise;
};

const handler = async (event, context) => {
  // No callback wait is needed for cached SDK/database sockets.
  context.callbackWaitsForEmptyEventLoop = false;
  const proxy = await getProxy();
  return proxy(event, context);
};

module.exports = { handler };
