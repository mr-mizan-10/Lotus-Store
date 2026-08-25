require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./logger');
const requestId = require('./middleware/requestId');

const app = express();
app.disable('x-powered-by');

// Connect to MongoDB
connectDB();

// Parse multiple production frontend URLs if provided (comma-separated)
const frontendUrls = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://lotus-store-frontend.onrender.com',
  ...frontendUrls
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // (Postman, server-to-server requests, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow configured development & production origins or localhost/127.0.0.1 on any port
    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (allowedOrigins.includes(origin) || isLocalDev) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(requestId);

// Basic security headers (no extra dependency required)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  next();
});

// Health check endpoint for cloud platforms
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server started on ${PORT}`);
});