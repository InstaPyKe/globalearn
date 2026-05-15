const db = require('../db');

exports.getAvailableTasks = async (req, res) => {
    try {
        // Check for 24-hour rolling cooldown
        const dailyCheck = await db.query(
            `SELECT EXTRACT(EPOCH FROM (completed_at + INTERVAL '24 hours') - NOW())::INT as seconds_left 
             FROM user_tasks 
             WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '24 hours'
             ORDER BY completed_at DESC LIMIT 1`,
            [req.user.id]
        );

        if (dailyCheck.rows.length > 0) {
            return res.json({ limitReached: true, secondsLeft: dailyCheck.rows[0].seconds_left });
        }

        // Get tasks the user hasn't completed yet
        const tasks = await db.query(
            `SELECT * FROM tasks WHERE is_active = TRUE 
             AND id NOT IN (SELECT task_id FROM user_tasks WHERE user_id = $1)`,
            [req.user.id]
        );
        res.json(tasks.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.completeTask = async (req, res) => {
    const { taskId } = req.body;
    try {
        // 0. Check for 24-hour rolling cooldown
        const dailyCheck = await db.query(
            `SELECT id, EXTRACT(EPOCH FROM (completed_at + INTERVAL '24 hours') - NOW())::INT as seconds_left 
             FROM user_tasks
             WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '24 hours'
             ORDER BY completed_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (dailyCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Daily limit reached', secondsLeft: dailyCheck.rows[0].seconds_left });
        }

        const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

        const task = taskRes.rows[0];

        // Start Transaction
        await db.query('BEGIN');

        // 1. Record completion
        await db.query('INSERT INTO user_tasks (user_id, task_id) VALUES ($1, $2)', [req.user.id, taskId]);

        // 2. Update user balance
        await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [task.reward, req.user.id]);

        // 3. Log transaction
        await db.query(
            'INSERT INTO transactions (user_id, type, amount, status, method) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'task_reward', task.reward, 'completed', 'System']
        );

        await db.query('COMMIT');
        res.json({ message: 'Reward claimed successfully', reward: task.reward });

    } catch (err) {
        await db.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: 'Task already completed' });
        res.status(500).json({ error: err.message });
    }
};