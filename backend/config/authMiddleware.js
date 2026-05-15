const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    // Check if no token
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { id: ... }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};