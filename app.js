const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const authRoutes = require('./routes/auth');
const protectedRoute = require('./routes/protectedRoute');

// Logging Middleware
app.use(morgan('combined')); // Log all HTTP requests

// Security Middleware
app.use(helmet()); // Sets various HTTP headers for security

// CORS - Allow only specific origins
app.use(cors({
    origin: 'http://localhost:3000', // Change to your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per windowMs
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 requests per windowMs
    message: 'Too many login attempts, please try again later',
    skipSuccessfulRequests: true, // Don't count successful requests
});

app.use(express.json());

// Apply rate limiting
app.use('/auth/login', authLimiter); // Stricter limit for login
app.use('/auth/register', authLimiter); // Stricter limit for register
app.use('/', limiter); // General rate limit for all routes

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/jwt-app')
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

app.use('/auth', authRoutes);
app.use('/protected', protectedRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});