const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Sentry = require('@sentry/node');
const { registerSchema, loginSchema } = require('../validations/authValidation');

// User registration
router.post('/register', async (req, res) => {
    try {
        // ✅ Validate request body
        const { error } = registerSchema.validate(req.body);
        if (error) {
            console.log('Validation error:', error.details[0].message);
            return res.status(400).json({ error: error.details[0].message });
        }

        const { username, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();

        console.log('User registered:', username);
        res.status(201).json({ message: 'User registered successfully', userId: user._id });
    } catch (error) {
        console.error('Registration error:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// User login
router.post('/login', async (req, res) => {
    try {
        // ✅ Validate request body
        const { error } = loginSchema.validate(req.body);
        if (error) {
            console.log('Validation error:', error.details[0].message);
            return res.status(400).json({ error: error.details[0].message });
        }

        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Authentication failed' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Authentication failed' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
            expiresIn: '1h',
        });

        console.log('User logged in:', username);
        res.status(200).json({ token, userId: user._id });
    } catch (error) {
        console.error('Login error:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

module.exports = router;