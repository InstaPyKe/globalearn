const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Assuming db.js is in the backend folder

/**
 * Checks if a referrer exists by their code.
 */
exports.getReferrer = async (req, res, next) => {
    try {
        const { code } = req.params;
        const result = await db.query('SELECT username FROM users WHERE referral_code = $1', [code]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Invalid referral code." });
        }
        res.json({ username: result.rows[0].username });
    } catch (error) {
        next(error);
    }
};

/**
 * Registers a new user.
 * Handles username, email, and password validation, hashing, and database insertion.
 */
exports.registerUser = async (req, res, next) => {
    try {
        // Sanitize and normalize inputs
        const username = req.body.username?.trim();
        const email = req.body.email?.trim().toLowerCase();
        const phone = req.body.phone?.trim();
        const password = req.body.password;
        const referrerCode = req.body.referrerCode?.trim();

        // Basic validation
        if (!username || !email || !password || !phone) {
            return res.status(400).json({ error: "Username, email, password, and phone are required." });
        }

        // Comprehensive duplicate check (Email, Username, and Phone)
        const existingUser = await db.query('SELECT email, username, phone FROM users WHERE email = $1 OR username = $2 OR phone = $3', [email, username, phone]);
        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            if (user.email === email) return res.status(409).json({ error: "Email already registered." });
            if (user.phone === phone) return res.status(409).json({ error: "Phone number already registered." });
            return res.status(409).json({ error: "Username already taken." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Handle Referral logic
        let referredById = null;
        // Only query if referrerCode is a valid non-empty string
        if (referrerCode) {
            const refRes = await db.query('SELECT id FROM users WHERE referral_code = $1', [referrerCode]);
            if (refRes.rows.length > 0) referredById = refRes.rows[0].id;
        }

        // Generate a simple referral code for the new user
        // We take the first 10 chars of username to keep the code short and safe for the DB
        const cleanName = username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const userRefCode = `${cleanName}${randomSuffix}`;

        // Insert new user into the database
        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash, referred_by_id, referral_code, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email',
            [username, email, passwordHash, referredById, userRefCode, phone]
        );

        // Send success response
        res.status(201).json({ 
            message: "Registration successful. Please log in.",
            user: { id: newUser.rows[0].id, username: newUser.rows[0].username, email: newUser.rows[0].email }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        next(error); // Pass error to global error handler
    }
};

/**
 * Handles user login request and issues JWT immediately.
 */
exports.loginUser = async (req, res, next) => {
    try {
        // Sanitize and normalize inputs to match registration data
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;
        const phone = req.body.phone?.trim();
        
        if (!email || !password || !phone) {
            return res.status(400).json({ error: 'Email, password, and phone number are required.' });
        }

        // 1. Fetch User from Database - Verify both email and phone for higher security
        const result = await db.query('SELECT * FROM users WHERE email = $1 AND phone = $2', [email, phone]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials. Please verify your email and phone number.' });
        }
        const user = result.rows[0];

        // 2. Verify password hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // 3. Issue JWT immediately
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email, 
                username: user.username 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );
        res.json({ message: 'Login successful', token });
    } catch (error) {
        next(error);
    }
};