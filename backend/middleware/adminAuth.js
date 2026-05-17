const adminAuth = (req, res, next) => {
    // Re-enabling Admin authorization for production security
    // Assumes the 'auth' middleware has already verified the JWT and populated req.user
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Administrator authority required.' });
    }
};

module.exports = adminAuth;