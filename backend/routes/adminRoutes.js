const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware'); // In production, add a separate adminAuth middleware
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// @route POST /api/admin/login (Public)
router.post('/login', adminController.adminLogin);

// @route GET /api/admin/stats
router.get('/stats', auth, adminAuth, adminController.getDashboardStats);

// Membership Tier Management
router.get('/tiers', auth, adminAuth, adminController.getMembershipTiers);
router.post('/tiers', auth, adminAuth, adminController.createMembershipTier);
router.delete('/tiers/:id', auth, adminAuth, adminController.deleteMembershipTier);

// Task Management
router.get('/tasks', auth, adminAuth, adminController.getAdminTasks);
router.post('/tasks', auth, adminAuth, adminController.createTask);
router.patch('/tasks/:id/status', auth, adminAuth, adminController.toggleTaskStatus);
router.delete('/tasks/:id', auth, adminAuth, adminController.deleteTask);
router.put('/tasks/:id', auth, adminAuth, adminController.updateTask);

// Financial Management
router.get('/payouts', auth, adminAuth, adminController.getPayoutQueue);
router.patch('/payouts/:id', auth, adminAuth, adminController.updateWithdrawalStatus);
router.get('/settings', auth, adminAuth, adminController.getSystemSettings);
router.post('/settings', auth, adminAuth, adminController.updateSystemSettings);

// Security Monitor
router.get('/security/stats', auth, adminAuth, adminController.getSecurityStats);
router.get('/security/incidents', auth, adminAuth, adminController.getSecurityIncidents);
router.patch('/security/resolve/:id', auth, adminAuth, adminController.resolveIncident);

// Support Ticketing
router.get('/support/stats', auth, adminAuth, adminController.getSupportStats);
router.get('/support/tickets', auth, adminAuth, adminController.getSupportTickets);
router.patch('/support/tickets/:id', auth, adminAuth, adminController.updateTicketStatus);

// User Core Management
router.get('/users', auth, adminAuth, adminController.getUsers);
router.post('/users/:id/action', auth, adminAuth, adminController.manageUser);

module.exports = router;