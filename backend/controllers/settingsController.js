const db = require('../db');
const bcrypt = require('bcryptjs');

// Fetch current user settings
exports.getSettings = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT preferred_language, timezone, two_fa_enabled, kyc_status, username FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Update Localization (Language/Timezone)
exports.updateLocalization = async (req, res) => {
    const { language, timezone } = req.body;
    try {
        await db.query(
            'UPDATE users SET preferred_language = $1, timezone = $2 WHERE id = $3',
            [language, timezone, req.user.id]
        );
        res.json({ message: 'Preferences updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        // 1. Verify Current Password
        const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
        
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // 2. Hash and Save New Password
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);
        res.json({ message: 'Password updated successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Submit KYC Document
exports.submitKYC = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

    try {
        const filePath = req.file.path.replace(/\\/g, '/'); // Normalize path for URLs
        await db.query(
            "UPDATE users SET kyc_status = 'pending', kyc_document_path = $1, kyc_submitted_at = NOW() WHERE id = $2",
            [filePath, req.user.id]
        );
        res.json({ message: 'KYC Document submitted successfully for review.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit KYC' });
    }
};

// Mock Toggle 2FA (In a real app, this would involve QR code verification)
exports.toggle2FA = async (req, res) => {
    try {
        const statusRes = await db.query('SELECT two_fa_enabled FROM users WHERE id = $1', [req.user.id]);
        const newStatus = !statusRes.rows[0].two_fa_enabled;
        
        await db.query('UPDATE users SET two_fa_enabled = $1 WHERE id = $2', [newStatus, req.user.id]);
        res.json({ message: `2FA ${newStatus ? 'Enabled' : 'Disabled'}`, status: newStatus });
    } catch (err) {
        res.status(500).json({ error: 'Action failed' });
    }
};