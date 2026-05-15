const db = require('../db');

exports.getTransactions = async (req, res) => {
    try {
        // Fetch all transactions for the authenticated user
        const transactions = await db.query(
            'SELECT id, type, amount, method, status, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json(transactions.rows);
    } catch (err) {
        console.error('Error fetching transactions:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.requestWithdrawal = async (req, res) => {
    const { amount, method, destination } = req.body;
    const userId = req.user.id;
    
    // Acquire a specific client from the pool for the transaction
    const client = await db.connect();

    if (!amount || amount < 500) {
        client.release();
        return res.status(400).json({ error: 'Minimum withdrawal is KSH. 500' });
    }

    try {
        await client.query('BEGIN');

        // 1. Check user balance (Lock row for update)
        const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
        const balance = parseFloat(userRes.rows[0].balance);

        if (balance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // 2. Deduct from balance
        await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);

        // 3. Create transaction record
        const refId = `WDR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await client.query(
            `INSERT INTO transactions (user_id, type, amount, method, status, reference_id) 
             VALUES ($1, 'withdrawal', $2, $3, 'pending', $4)`,
            [userId, amount, method.toUpperCase(), refId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Withdrawal request submitted successfully. Ref: ' + refId });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {}); // Silent rollback if connection is lost
        console.error('Withdrawal Error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};