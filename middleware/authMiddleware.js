const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    // Get the token from the Authorization header
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Handle "Bearer <token>" or just "<token>"
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, 'your-secret-key');
        req.userId = decoded.userId;
        next(); // continue to the next middleware/route
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = verifyToken;
