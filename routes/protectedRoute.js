// routes/protectedRoute.js

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
// Protected route
router.get('/', verifyToken, (req, res) => {
    console.log(req, "addd")
    res.status(200).json({ message: 'Protected route accessed' });
});

module.exports = router;