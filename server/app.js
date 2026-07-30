const { logger } = require('./datadog');

// Import required modules
const express = require('express');          // Express framework for building the server
const cookieParser = require('cookie-parser');
const path = require('path');                // Node.js module to handle file paths
const { connectDB } = require('./db/mongo');
const authRoutes = require('./routes/auth'); // Import authentication routes from a separate file

// Create an Express app
const app = express();

// Environment configuration
require('dotenv').config();

// Middleware: Parse incoming JSON data in requests (used in POST requests like login/register)
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Middleware: Serve all static files (HTML, CSS, JS, images, etc.) from the "public" folder
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (_error) {
    res.status(503).json({ msg: 'Service temporarily unavailable' });
  }
});

app.use('/api/auth', authRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || 'local'
  });
});

// Route: Redirect root URL ("/") to the main homepage (index.html in public/pages)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'index.html'));
});

module.exports = app;
