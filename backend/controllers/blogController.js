const db = require('../db');

exports.createPost = async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
        // Randomize some metadata for the UI variety
        const categories = ['Cryptocurrency', 'Digital Nomads', 'Passive Income', 'Tech Trends', 'Global Business'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const readTime = Math.floor(Math.random() * 45) + 30; // 30-75s
        const reward = 25.00;

        const query = `
            INSERT INTO blog_posts (user_id, title, content, category, read_time, reward, status) 
            VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
            RETURNING *`;
        
        const result = await db.query(query, [userId, title, content, category, readTime, reward]);
        
        res.status(201).json({ message: 'Article published successfully!', post: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error while saving post.' });
    }
};

exports.getAvailablePosts = async (req, res) => {
    try {
        const query = `
            SELECT b.*, u.username as author 
            FROM blog_posts b 
            JOIN users u ON b.user_id = u.id 
            WHERE b.status = 'approved' 
            ORDER BY b.created_at DESC`;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch articles.' });
    }
};

exports.completeRead = async (req, res) => {
    const { blogId } = req.body;
    const userId = req.user.id;

    try {
        // NEW: Check for 24-hour cooldown for any blog reward
        const lastBlogReward = await db.query(
            `SELECT created_at FROM transactions 
             WHERE user_id = $1 AND type = 'blog_reward' 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (lastBlogReward.rows.length > 0) {
            const lastClaimTime = new Date(lastBlogReward.rows[0].created_at);
            const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
            
            if (lastClaimTime > twentyFourHoursAgo) {
                const timeRemainingMs = (lastClaimTime.getTime() + (24 * 60 * 60 * 1000)) - Date.now();
                const hours = Math.floor(timeRemainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return res.status(400).json({ 
                    error: `You can only claim one blog reward every 24 hours. Please wait ${hours}h ${minutes}m.`,
                    secondsLeft: Math.ceil(timeRemainingMs / 1000) // For frontend countdown
                });
            }
        }
        // 1. Prevent double earning (One reward per blog)
        const check = await db.query('SELECT * FROM transactions WHERE user_id = $1 AND type = $2 AND reference_id = $3', [userId, 'blog_reward', `BLOG-${blogId}`]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Reward already claimed for this article.' });

        // 2. Fetch reward amount
        const blogRes = await db.query('SELECT reward, title FROM blog_posts WHERE id = $1', [blogId]);
        if (blogRes.rows.length === 0) return res.status(404).json({ error: 'Article not found.' });
        
        const amount = blogRes.rows[0].reward;

        await db.query('BEGIN');

        // 3. Update User Balance
        const userUpdate = await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance', [amount, userId]);
        
        // 4. Log Transaction
        await db.query(
            'INSERT INTO transactions (user_id, type, amount, status, method, reference_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, 'blog_reward', amount, 'completed', 'System', `BLOG-${blogId}`]
        );

        await db.query('COMMIT');

        res.json({ 
            message: 'Reward settled!', 
            reward: amount,
            newBalance: userUpdate.rows[0].balance 
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Settlement failed.' });
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        const query = `
            SELECT b.*, u.username as author 
            FROM blog_posts b
            JOIN users u ON b.user_id = u.id
            WHERE b.user_id = $1 
            ORDER BY b.created_at DESC`;
        const result = await db.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch your articles.' });
    }
};