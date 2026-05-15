const db = require('../db');

exports.getNetwork = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch Level 1 (Directly referred by user)
        const l1 = await db.query(
            "SELECT username, created_at, (CASE WHEN last_activity > NOW() - INTERVAL '30 minutes' THEN 'Active' ELSE 'Idle' END) as status FROM users WHERE referred_by_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        // Fetch Level 2 (Referred by Level 1)
        const l2 = await db.query(
            `SELECT username, created_at, (CASE WHEN last_activity > NOW() - INTERVAL '30 minutes' THEN 'Active' ELSE 'Idle' END) as status 
             FROM users 
             WHERE referred_by_id IN (SELECT id FROM users WHERE referred_by_id = $1)
             ORDER BY created_at DESC`,
            [userId]
        );

        // Fetch Level 3 (Referred by Level 2)
        const l3 = await db.query(
            `SELECT username, created_at, (CASE WHEN last_activity > NOW() - INTERVAL '30 minutes' THEN 'Active' ELSE 'Idle' END) as status 
             FROM users 
             WHERE referred_by_id IN (
                 SELECT id FROM users WHERE referred_by_id IN (
                     SELECT id FROM users WHERE referred_by_id = $1
                 )
             )
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            level1: l1.rows,
            level2: l2.rows,
            level3: l3.rows
        });
    } catch (err) {
        console.error('Network fetch error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};