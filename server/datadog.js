// Initialize Datadog tracing - must be imported and initialized FIRST
const tracer = require('dd-trace').init({
  service: process.env.DD_SERVICE || 'fitness-tracker',
  env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
  version: process.env.DD_VERSION || '1.0.0',
  logInjection: true,
  runtimeMetrics: true
});

// Enhanced console logging for Datadog
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  const message = args.join(' ');
  originalLog(`{"level":"info","message":"${message}","timestamp":"${new Date().toISOString()}","service":"fitness-tracker"}`);
};

console.error = function(...args) {
  const message = args.join(' ');
  originalError(`{"level":"error","message":"${message}","timestamp":"${new Date().toISOString()}","service":"fitness-tracker"}`);
};

// Helper function for structured logging
const logger = {
  info: (message, data = {}) => {
    originalLog(JSON.stringify({
      level: 'info',
      message,
      ...data,
      timestamp: new Date().toISOString(),
      service: 'fitness-tracker'
    }));
  },
  error: (message, error = {}) => {
    originalError(JSON.stringify({
      level: 'error',
      message,
      error: error.message || error,
      timestamp: new Date().toISOString(),
      service: 'fitness-tracker'
    }));
  },
  warn: (message, data = {}) => {
    originalLog(JSON.stringify({
      level: 'warn',
      message,
      ...data,
      timestamp: new Date().toISOString(),
      service: 'fitness-tracker'
    }));
  }
};

module.exports = { tracer, logger };
