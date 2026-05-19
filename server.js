const dotenv = require('dotenv');
dotenv.config(); // Initialize environment variables before any other imports

const express = require('express');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./backend/db');
const bcrypt = require('bcryptjs');

// Import existing controllers for other routes
const authController = require('./backend/controllers/authController');
const mpesaController = require('./backend/controllers/mpesaController');

// API Route Imports
const authRoutes = require('./backend/routes/authRoutes');
const transactionRoutes = require('./backend/routes/transactionRoutes');
const userRoutes = require('./backend/routes/userRoutes');
const taskRoutes = require('./backend/routes/taskRoutes');
const mpesaRoutes = require('./backend/routes/mpesaRoutes');
const referralRoutes = require('./backend/routes/referralRoutes');
const settingsRoutes = require('./backend/routes/settingsRoutes');
const surveyRoutes = require('./backend/routes/surveyRoutes');
const membershipRoutes = require('./backend/routes/membershipRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');

const app = express();
app.use(cors()); // Enable CORS to prevent "Connection Error" on cross-origin requests
app.use(express.json());

// --- API ROUTE MOUNTING ---
app.use('/api/auth', authRoutes);
// Explicit override for login to ensure authController logic is used if needed
app.post('/api/auth/login', authController.loginUser);
app.get('/api/auth/referrer/:code', authController.getReferrer);

app.use('/api/transactions', transactionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/admin', adminRoutes);

// Health Check / DB Diagnostic Route
app.get('/api/health', async (req, res) => {
    try {
        const userCount = await db.query('SELECT COUNT(*)::INT as count FROM users');
        res.json({ 
            status: 'online', 
            users_table: 'connected', 
            total_users: userCount.rows[0].count 
        });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// --- CLEAN URL ROUTING FOR PUBLIC PAGES ---
// These must be defined BEFORE the express.static middleware
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leaderboard.html')));

app.get('/payments', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payments.html'));
});

app.get('/features', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'features.html'));
});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'faq.html'));
});

app.get('/legal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'legal.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Primary static folder for frontend assets (images, css, js files)
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static('public')); 
app.use('/users', express.static(path.join(__dirname, 'users')));

// 404 Handler for unmatched routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Global Error Handling Middleware
// This must be the last middleware added to the app
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        error: message,
        // Optionally, include more details in development, but not in production
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server operational on port ${PORT} (0.0.0.0)`);
});