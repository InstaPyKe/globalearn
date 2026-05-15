const adminAuth = (req, res, next) => {
    // Assumes your auth middleware attaches the user object to req
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Administrator authority required.' });
    }
};

module.exports = adminAuth;