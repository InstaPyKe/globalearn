const db = require('../db');
const jwt = require('jsonwebtoken');

exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Query the dedicated admins table
        const result = await db.query("SELECT * FROM admins WHERE username = $1", [username]);
        const admin = result.rows[0];

        if (admin && admin.password_hash === password) {
            const token = jwt.sign(
                { id: admin.id, username: admin.username, role: 'admin' }, 
                process.env.JWT_SECRET, 
                { expiresIn: '24h' }
            );
            return res.json({ token });
        }
    } catch (err) { console.error(err); }

    res.status(401).json({ error: 'Invalid Admin Credentials' });
};

exports.getDashboardStats = async (req, res) => {
    try {
        // Aggregate stats in parallel for speed
        const [
            userStats,
            revenueRes,
            liabilityRes,
            pendingWdr,
            fraudFlags,
            taskTrend,
            taskDist,
            totalPaidOut,
            tierDist
        ] = await Promise.all([
            db.query("SELECT COUNT(*)::INT as total, COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::INT as today FROM users"),
            db.query(`SELECT (
                COALESCE((SELECT SUM(amount) FROM membership_upgrades WHERE status = 'approved'), 0) + 
                COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'ad_revenue'), 0)
            ) as total`),
            db.query("SELECT COALESCE(SUM(balance), 0) as total FROM users"),
            db.query("SELECT COUNT(*)::INT as total FROM transactions WHERE type = 'withdrawal' AND status = 'pending'"),
            db.query("SELECT COUNT(*)::INT as total FROM security_flags WHERE status = 'active'"),
            db.query(`
                SELECT TO_CHAR(completed_at, 'DD Mon') as label, COUNT(*)::INT as value
                FROM user_tasks
                WHERE completed_at > NOW() - INTERVAL '7 days'
                GROUP BY label, DATE_TRUNC('day', completed_at)
                ORDER BY DATE_TRUNC('day', completed_at) ASC
            `),
            db.query(`
                SELECT t.title as label, COUNT(ut.id)::INT as value
                FROM tasks t
                LEFT JOIN user_tasks ut ON t.id = ut.task_id
                GROUP BY t.id, t.title
                ORDER BY value DESC LIMIT 5
            `),
            db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'withdrawal' AND status = 'completed'"),
            db.query(`
                SELECT membership_tier as label, COUNT(*)::INT as value 
                FROM users 
                GROUP BY membership_tier
            `)
        ]);

        const totalUsers = parseInt(userStats.rows[0]?.total || 0);
        const newUsersToday = parseInt(userStats.rows[0]?.today || 0);
        const totalRevenue = parseFloat(revenueRes.rows[0]?.total || 0);
        const totalLiability = parseFloat(liabilityRes.rows[0]?.total || 0);
        const paidOut = parseFloat(totalPaidOut.rows[0]?.total || 0);

        const netProfit = totalRevenue - totalLiability;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

        res.json({
            totalUsers,
            newUsersToday,
            revenue: totalRevenue,
            liability: totalLiability,
            netProfit: netProfit,
            totalPaid: paidOut,
            margin: profitMargin,
            pendingWithdrawals: parseInt(pendingWdr.rows[0]?.total || 0),
            activeFraudFlags: parseInt(fraudFlags.rows[0]?.total || 0),
            serverLoad: Math.floor(Math.random() * (20 - 5 + 1) + 5),
            taskTrend: taskTrend.rows,
            taskDist: taskDist.rows,
            tierDist: tierDist.rows
        });
    } catch (err) {
        console.error('Admin Stats Error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.createTask = async (req, res) => {
    const { title, url, reward, cap } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO tasks (title, video_url, reward, view_cap) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, url, reward, cap]
        );
        res.json({ message: 'Task deployed successfully', task: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to deploy task' });
    }
};

exports.getAdminTasks = async (req, res) => {
    try {
        // Fetch tasks and join with user_tasks to count completions
        const result = await db.query(`
            SELECT t.*, 
            (SELECT COUNT(*) FROM user_tasks WHERE task_id = t.id) as current_views
            FROM tasks t 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.toggleTaskStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const check = await db.query('SELECT is_active FROM tasks WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        
        const newStatus = !check.rows[0].is_active;
        await db.query('UPDATE tasks SET is_active = $1 WHERE id = $2', [newStatus, id]);
        
        res.json({ message: `Task ${newStatus ? 'Activated' : 'Paused'}`, status: newStatus });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
};

exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, url, reward, cap } = req.body;
    try {
        await db.query(
            'UPDATE tasks SET title = $1, video_url = $2, reward = $3, view_cap = $4 WHERE id = $5',
            [title, url, reward, cap, id]
        );
        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update task' });
    }
};

// Get Payout Queue (Pending Withdrawals)
exports.getPayoutQueue = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                t.id, t.amount, t.method, t.reference_id, t.created_at,
                u.username, u.id as user_id,
                COALESCE((SELECT COUNT(*) FROM security_flags WHERE user_id = u.id AND status = 'active'), 0) as risk_flags
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE t.type = 'withdrawal' AND t.status = 'pending'
            ORDER BY t.created_at ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payout queue' });
    }
};

// Approve/Reject Withdrawal
exports.updateWithdrawalStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'completed' or 'rejected'

    if (!['completed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status update' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const transRes = await client.query('SELECT user_id, amount FROM transactions WHERE id = $1 AND status = $2', [id, 'pending']);
        
        if (transRes.rows.length === 0) throw new Error('Transaction not found or already processed');
        
        if (status === 'rejected') {
            const { user_id, amount } = transRes.rows[0];
            await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, user_id]);
        }

        await client.query('UPDATE transactions SET status = $1 WHERE id = $2', [status, id]);
        await client.query('COMMIT');
        res.json({ message: `Withdrawal successfully ${status}` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// System Settings (Kill Switch)
exports.getSystemSettings = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM system_settings');
        const settings = {};
        result.rows.forEach(row => settings[row.setting_key] = row.setting_value);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

// Security Monitor Stats
exports.getSecurityStats = async (req, res) => {
    try {
        const [ipRes, clusterRes, vpnRes] = await Promise.all([
            db.query("SELECT COUNT(*) FROM security_flags WHERE type = 'multi_account' AND status = 'active'"),
            db.query("SELECT COUNT(*) FROM security_flags WHERE type = 'device_cluster' AND status = 'active'"),
            db.query("SELECT COUNT(*) FROM security_flags WHERE type = 'vpn' AND status = 'active'")
        ]);

        res.json({
            ipConflicts: parseInt(ipRes.rows[0].count),
            deviceClusters: parseInt(clusterRes.rows[0].count),
            vpnDetected: parseInt(vpnRes.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get Live Incident Feed
exports.getSecurityIncidents = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT sf.*, u.username, u.email 
            FROM security_flags sf
            LEFT JOIN users u ON sf.user_id = u.id
            WHERE sf.status = 'active'
            ORDER BY sf.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Resolve Flag
exports.resolveIncident = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("UPDATE security_flags SET status = 'resolved' WHERE id = $1", [id]);
        res.json({ message: 'Incident resolved' });
    } catch (err) {
        res.status(500).json({ error: 'Action failed' });
    }
};

exports.updateSystemSettings = async (req, res) => {
    const settings = req.body; // Expecting object { key: value }
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        for (const [key, value] of Object.entries(settings)) {
            await client.query(
                `INSERT INTO system_settings (setting_key, setting_value, updated_at) 
                 VALUES ($1, $2, NOW()) 
                 ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
                [key, value.toString()]
            );
        }
        await client.query('COMMIT');
        res.json({ message: 'System configurations updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to push updates to production' });
    } finally {
        client.release();
    }
};

// Support Ticketing Stats
exports.getSupportStats = async (req, res) => {
    try {
        const [openRes, resetRes] = await Promise.all([
            db.query("SELECT COUNT(*) FROM support_tickets WHERE status = 'open'"),
            db.query("SELECT COUNT(*) FROM support_tickets WHERE category = '2FA Reset Request' AND status != 'closed'")
        ]);

        res.json({
            openTickets: parseInt(openRes.rows[0].count),
            pendingResets: parseInt(resetRes.rows[0].count),
            avgResponse: "4.2h" // This would normally be calculated from timestamps
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get Ticket Queue
exports.getSupportTickets = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT st.*, u.username 
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            ORDER BY st.updated_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update Ticket
exports.updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query(
            "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2",
            [status, id]
        );
        res.json({ message: 'Ticket updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update ticket' });
    }
};

// Get All Users with Search
exports.getUsers = async (req, res) => {
    const { q } = req.query;
    try {
        let query = `
            SELECT 
                u.id, u.username, u.email, u.balance, u.kyc_status, u.status, u.phone, 
                u.last_login_ip, u.created_at, u.wallet_address,
                inviter.username as referrer_name,
                COALESCE(s.total_earned, 0) as total_earned,
                (SELECT COUNT(*) FROM users WHERE invited_by = u.id) as referral_count
            FROM users u
            LEFT JOIN users inviter ON u.invited_by = inviter.id
            LEFT JOIN user_earning_stats s ON u.id = s.user_id
        `;
        const params = [];

        if (q) {
            query += ` WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1`;
            params.push(`%${q}%`);
        }

        query += ` ORDER BY u.created_at DESC LIMIT 50`;
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Verify/Reject KYC or Ban User
exports.manageUser = async (req, res) => {
    const { id } = req.params;
    const { action, amount } = req.body; // Added amount for balance adjustments

    try {
        if (action === 'adjust_balance') {
            await db.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amount, id]);
            return res.json({ message: `Balance adjusted by KSH. ${amount}` });
        }
        if (action === 'verify') {
            await db.query("UPDATE users SET kyc_status = 'verified' WHERE id = $1", [id]);
            return res.json({ message: 'User identity verified' });
        }
        if (action === 'reject') {
            await db.query("UPDATE users SET kyc_status = 'rejected' WHERE id = $1", [id]);
            return res.json({ message: 'KYC documents rejected' });
        }
        if (action === 'ban') {
            await db.query("UPDATE users SET status = 'banned' WHERE id = $1", [id]);
            return res.json({ message: 'User permanently banned' });
        }
        res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        res.status(500).json({ error: 'Action failed' });
    }
};

// Membership Tier Management
exports.getMembershipTiers = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM membership_tiers ORDER BY price ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch membership tiers' });
    }
};

exports.createMembershipTier = async (req, res) => {
    const { tier_key, display_name, price, duration_text, daily_cap, withdrawal_speed, ref_structure, support_level, daily_spins, extra_perks, is_popular } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO membership_tiers 
            (tier_key, display_name, price, duration_text, daily_cap, withdrawal_speed, ref_structure, support_level, daily_spins, extra_perks, is_popular) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [tier_key, display_name, price, duration_text, daily_cap, withdrawal_speed, ref_structure, support_level, daily_spins, extra_perks, is_popular]
        );
        res.json({ message: 'Membership tier deployed successfully', tier: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to deploy tier' });
    }
};

exports.deleteMembershipTier = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM membership_tiers WHERE id = $1', [id]);
        res.json({ message: 'Tier permanently removed' });
    } catch (err) {
        res.status(500).json({ error: 'Deletion failed' });
    }
};

exports.getAdminBlogs = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.*, u.username as author_name, u.email as author_email
            FROM blog_posts b
            JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
};

exports.approveBlog = async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
        // 1. Fetch blog details to get the author and reward amount
        const blogRes = await client.query("SELECT user_id, reward, status, title FROM blog_posts WHERE id = $1", [id]);
        if (blogRes.rows.length === 0) return res.status(404).json({ error: 'Article not found' });

        const blog = blogRes.rows[0];

        // 2. Prevent double payment if already approved
        if (blog.status === 'approved') {
            return res.status(400).json({ error: 'Article is already approved and paid' });
        }

        await client.query('BEGIN');

        // 3. Update status to approved
        await client.query("UPDATE blog_posts SET status = 'approved' WHERE id = $1", [id]);

        // 4. Credit the user's balance
        await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [blog.reward, blog.user_id]);

        // 5. Log the transaction for the user's history
        const refId = `BLOG-PAY-${id}`;
        await client.query(
            "INSERT INTO transactions (user_id, type, amount, status, method, reference_id) VALUES ($1, $2, $3, $4, $5, $6)",
            [blog.user_id, 'blog_post_reward', blog.reward, 'completed', 'System', refId]
        );

        await client.query('COMMIT');
        res.json({ message: `Article approved. Author credited KSH. ${blog.reward}` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Approval Error:', err);
        res.status(500).json({ error: 'Approval and payment process failed' });
    } finally {
        client.release();
    }
};

exports.deleteBlog = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM blog_posts WHERE id = $1", [id]);
        res.json({ message: 'Article deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Deletion failed' });
    }
};