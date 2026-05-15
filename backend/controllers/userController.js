const db = require('../db');

exports.getProfile = async (req, res) => {
    try {
        // Fetch user details and count direct referrals (L1)
        const userQuery = await db.query(
            `SELECT u.username, u.email, u.balance, u.membership_tier, u.referral_code,
             (SELECT COUNT(*) FROM users WHERE referred_by_id = u.id) as referral_count,
             COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND type != 'withdrawal'), 0) as lifetime_earnings
             FROM users u 
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userQuery.rows[0];
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};