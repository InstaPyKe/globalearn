const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Corrected path
const authRoutes = require('./routes/authRoutes'); // Corrected path
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const spinRoutes = require('./routes/spinRoutes');
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
app.use('/api/transactions', transactionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/spin', spinRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/surveys', surveyRoutes); // NEW: Use survey routes
app.use('/api/settings', settingsRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Landing Page Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/homepage.html'));
});

// Health Check / DB Test Route
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ 
      status: 'online', 
      db_time: result.rows[0].now 
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ status: 'offline', error: err.message });
  }
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

app.listen(PORT, () => {
  console.log(`GlobalEarn API running on http://localhost:${PORT}`);
});