const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const Sentry = require('./config/sentry'); // Import from config
require('dotenv').config();

const app = express();

// ============ LOGGING & SECURITY ============
app.use(morgan('combined'));
app.use(helmet());

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later',
    skipSuccessfulRequests: true,
});

app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true });
});

app.use(express.json());
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/', limiter);

// ============ MONGODB CONNECTION ============
mongoose.connect('mongodb://localhost:27017/jwt-app')
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        Sentry.captureException(error);
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

// ============ ROUTES ============
const authRoutes = require('./routes/auth');
const protectedRoute = require('./routes/protectedRoute');
const paymentWebhooks = require('./routes/paymentWebhooks');
const ledgerRoutes = require('./routes/ledger');

app.use('/auth', authRoutes);
app.use('/protected', protectedRoute);
app.use('/webhooks', paymentWebhooks);
app.use('/ledger', ledgerRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    Sentry.captureException(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});