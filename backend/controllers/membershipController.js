const db = require('../db');

exports.requestUpgrade = async (req, res) => {
    const { tier, amount } = req.body;
    
    try {
        const result = await db.query(
            'INSERT INTO membership_upgrades (user_id, tier, amount) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, tier, amount]
        );

        res.json({ 
            message: `Upgrade request for ${tier.toUpperCase()} submitted. Please contact support to complete payment.`,
            request: result.rows[0] 
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to process upgrade request' });
    }
};