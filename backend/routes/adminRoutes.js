const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth'); // Corrected path to main auth middleware
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// @route POST /api/admin/login (Public)
router.post('/login', adminController.adminLogin);

// @route GET /api/admin/stats
router.get('/stats', authenticateToken, adminAuth, adminController.getDashboardStats);

// Membership Tier Management
router.get('/tiers', authenticateToken, adminAuth, adminController.getMembershipTiers);
router.post('/tiers', authenticateToken, adminAuth, adminController.createMembershipTier);
router.delete('/tiers/:id', authenticateToken, adminAuth, adminController.deleteMembershipTier);

// Task Management
router.get('/tasks', authenticateToken, adminAuth, adminController.getAdminTasks);
router.post('/tasks', authenticateToken, adminAuth, adminController.createTask);
router.patch('/tasks/:id/status', authenticateToken, adminAuth, adminController.toggleTaskStatus);
router.delete('/tasks/:id', authenticateToken, adminAuth, adminController.deleteTask);
router.put('/tasks/:id', authenticateToken, adminAuth, adminController.updateTask);

// Financial Management
router.get('/payouts', authenticateToken, adminAuth, adminController.getPayoutQueue);
router.patch('/payouts/:id', authenticateToken, adminAuth, adminController.updateWithdrawalStatus);
router.get('/settings', authenticateToken, adminAuth, adminController.getSystemSettings);
router.post('/settings', authenticateToken, adminAuth, adminController.updateSystemSettings);

// Security Monitor
router.get('/security/stats', authenticateToken, adminAuth, adminController.getSecurityStats);
router.get('/security/incidents', authenticateToken, adminAuth, adminController.getSecurityIncidents);
router.patch('/security/resolve/:id', authenticateToken, adminAuth, adminController.resolveIncident);

// Support Ticketing
router.get('/support/stats', authenticateToken, adminAuth, adminController.getSupportStats);
router.get('/support/tickets', authenticateToken, adminAuth, adminController.getSupportTickets);
router.patch('/support/tickets/:id', authenticateToken, adminAuth, adminController.updateTicketStatus);

// User Core Management
router.get('/users', authenticateToken, adminAuth, adminController.getUsers);
router.post('/users/:id/action', authenticateToken, adminAuth, adminController.manageUser);

module.exports = router;