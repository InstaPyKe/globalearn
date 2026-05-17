const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Corrected path
const authRoutes = require('./routes/authRoutes'); // Corrected path
const authController = require('./controllers/authController');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const spinRoutes = require('./routes/spinRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes'); // NEW: Import M-Pesa routes
const referralRoutes = require('./routes/referralRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const surveyRoutes = require('./routes/surveyRoutes'); // NEW: Import survey routes
const membershipRoutes = require('./routes/membershipRoutes');
const blogRoutes = require('./routes/blogRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root project folders
app.use(express.static(path.join(__dirname, '../public')));
app.use('/users', express.static(path.join(__dirname, '../users')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Routes
app.use('/api/auth', authRoutes);
// Explicit override for login to prevent 404s
app.post('/api/auth/login', authController.loginUser);
app.use('/api/transactions', transactionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/mpesa', mpesaRoutes); // NEW: Use M-Pesa routes
app.use('/api/tasks', taskRoutes);
app.use('/api/spin', spinRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/surveys', surveyRoutes); // NEW: Use survey routes
app.use('/api/settings', settingsRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// --- CLEAN URL ROUTING FOR PUBLIC PAGES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../public/register.html')));
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, '../public/leaderboard.html')));
app.get('/payments', (req, res) => res.sendFile(path.join(__dirname, '../public/payments.html')));
app.get('/features', (req, res) => res.sendFile(path.join(__dirname, '../public/features.html')));
app.get('/faq', (req, res) => res.sendFile(path.join(__dirname, '../public/faq.html')));
app.get('/legal', (req, res) => res.sendFile(path.join(__dirname, '../public/legal.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, '../public/contact.html')));

// Health Check / DB Test Route
app.get('/api/health', async (req, res) => {
  try {
    const dbTime = await db.query('SELECT NOW()');
    const userCount = await db.query('SELECT COUNT(*)::INT as count FROM users');
    res.json({ 
      status: 'online', 
      db_time: dbTime.rows[0].now,
      users_table: 'accessible',
      total_users: userCount.rows[0].count
    });
  } catch (err) {
    console.error('Health Check Failure:', err.message);
    res.status(500).json({ status: 'offline', error: err.message });
  }
});

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Global JSON Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Global Error Handling for startup/runtime stability
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    // In production, you might want to perform a graceful shutdown here
});

process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
    process.exit(1); // Exit to allow nodemon to restart the clean process
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GlobalEarn API operational on port ${PORT} (0.0.0.0)`);
});