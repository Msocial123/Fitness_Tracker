const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  const message = args.join(' ').replace(/"/g, '\"');
  originalLog(JSON.stringify({
    level: 'info',
    message: message,
    timestamp: new Date().toISOString(),
    service: 'fitness-tracker'
  }));
};

console.error = function(...args) {
  const message = args.join(' ').replace(/"/g, '\"');
  originalError(JSON.stringify({
    level: 'error',
    message: message,
    timestamp: new Date().toISOString(),
    service: 'fitness-tracker'
  }));
};

console.warn = function(...args) {
  const message = args.join(' ').replace(/"/g, '\"');
  originalLog(JSON.stringify({
    level: 'warn',
    message: message,
    timestamp: new Date().toISOString(),
    service: 'fitness-tracker'
  }));
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

module.exports = { logger };
