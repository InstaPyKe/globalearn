const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
    let { username, email, password, referrerCode } = req.body;

    try {
        // Sanitize inputs: remove leading/trailing spaces and normalize email casing
        email = email ? email.trim().toLowerCase() : '';
        username = username ? username.trim() : '';

        // 1. Check if user already exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (userExists.rows.length > 0) {
            if (userExists.rows[0].email === email) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            return res.status(400).json({ error: 'Username already taken' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Generate a unique referral code
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 4. Handle Referrer (Level 1)
        let referredById = null;
        if (referrerCode) {
            const referrer = await db.query('SELECT id FROM users WHERE referral_code = $1', [referrerCode]);
            if (referrer.rows.length > 0) {
                referredById = referrer.rows[0].id;
            }
        }

        // 5. Insert into database
        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash, referral_code, referred_by_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email',
            [username, email, hashedPassword, referralCode, referredById]
        );

        // 6. Generate JWT Token
        const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: newUser.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getReferrerByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await db.query('SELECT username FROM users WHERE referral_code = $1', [code]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }
        res.json({ username: result.rows[0].username });
    } catch (err) {
        console.error('Referrer info error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.loginUser = async (req, res) => {
    let { email, password } = req.body;

    try {
        // Sanitize input
        email = email ? email.trim().toLowerCase() : '';

        // 1. Check if user exists
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        const user = result.rows[0];

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        // Update last_activity timestamp
        await db.query('UPDATE users SET last_activity = NOW() WHERE id = $1', [user.id]);

        // 3. Generate JWT Token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};