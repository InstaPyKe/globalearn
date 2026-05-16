const express = require('express');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./backend/db');
const bcrypt = require('bcryptjs');

// Import existing controllers for other routes
const authController = require('./backend/controllers/authController');
// Import API Routers (Ensure these files exist in your backend/routes folder)
const surveyRoutes = require('./backend/routes/surveyRoutes');
// If you have other route files like referralRoutes, taskRoutes, add them here:
// const referralRoutes = require('./backend/routes/referralRoutes');

dotenv.config();

const app = express();
app.use(cors()); // Enable CORS to prevent "Connection Error" on cross-origin requests
app.use(express.json());

// REGISTRATION ROUTE - Now handled by authController
app.post('/api/auth/register', authController.registerUser);
// LOGIN ROUTE - Now handled by authController
app.post('/api/auth/login', authController.loginUser);
// REFERRER CHECK ROUTE - Added missing route used by register.js
app.get('/api/auth/referrer/:code', authController.getReferrer);

// --- API ROUTE MOUNTING ---
app.use('/api/surveys', surveyRoutes);
// app.use('/api/referrals', referralRoutes);

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