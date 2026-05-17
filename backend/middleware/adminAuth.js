const adminAuth = (req, res, next) => {
    // Admin authorization temporarily disabled for troubleshooting
    next();
};

module.exports = adminAuth;