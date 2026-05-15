const db = require('../db');

exports.performSpin = async (req, res) => {
    try {
        // 0. Check for 24-hour rolling cooldown
        const checkDaily = await db.query(
            `SELECT id, EXTRACT(EPOCH FROM (spun_at + INTERVAL '24 hours') - NOW())::INT as seconds_left 
             FROM lucky_spins
             WHERE user_id = $1 AND spun_at > NOW() - INTERVAL '24 hours'
             ORDER BY spun_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (checkDaily.rows.length > 0) {
            return res.status(400).json({ error: 'Daily limit reached', secondsLeft: checkDaily.rows[0].seconds_left });
        }

        // Defined prize sectors to match the wheel UI
        const prizes = [0, 5, 10, 20, 50, 100];
        const prizeIndex = Math.floor(Math.random() * prizes.length);
        const winAmount = prizes[prizeIndex];

        await db.query('BEGIN');

        // 1. Update balance and check if user exists
        if (winAmount > 0) {
            const userUpdate = await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING id', [winAmount, req.user.id]);
            
            if (userUpdate.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'User session invalid. Please log out and log in again.' });
            }
            
            await db.query(
                'INSERT INTO transactions (user_id, type, amount, status, method) VALUES ($1, $2, $3, $4, $5)',
                [req.user.id, 'spin_win', winAmount, 'completed', 'System']
            );
        }

        // 2. Log spin into history
        await db.query(
            'INSERT INTO lucky_spins (user_id, prize_amount, prize_label) VALUES ($1, $2, $3)',
            [req.user.id, winAmount, `KSH. ${winAmount} Prize`]
        );

        await db.query('COMMIT');
        res.json({ winAmount, prizeIndex, message: winAmount > 0 ? `You won KSH. ${winAmount}!` : 'Better luck next time!' });

    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
};