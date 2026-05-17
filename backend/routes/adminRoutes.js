const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware'); // In production, add a separate adminAuth middleware
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// @route POST /api/admin/login (Public)
router.post('/login', adminController.adminLogin);

// @route GET /api/admin/stats
router.get('/stats', adminController.getDashboardStats);

// Membership Tier Management
router.get('/tiers', adminController.getMembershipTiers);
router.post('/tiers', adminController.createMembershipTier);
router.delete('/tiers/:id', adminController.deleteMembershipTier);

// Task Management
router.get('/tasks', adminController.getAdminTasks);
router.post('/tasks', adminController.createTask);
router.patch('/tasks/:id/status', adminController.toggleTaskStatus);
router.delete('/tasks/:id', adminController.deleteTask);
router.put('/tasks/:id', adminController.updateTask);

// Financial Management
router.get('/payouts', adminController.getPayoutQueue);
router.patch('/payouts/:id', adminController.updateWithdrawalStatus);
router.get('/settings', adminController.getSystemSettings);
router.post('/settings', adminController.updateSystemSettings);

// Security Monitor
router.get('/security/stats', adminController.getSecurityStats);
router.get('/security/incidents', adminController.getSecurityIncidents);
router.patch('/security/resolve/:id', adminController.resolveIncident);

// Support Ticketing
router.get('/support/stats', adminController.getSupportStats);
router.get('/support/tickets', adminController.getSupportTickets);
router.patch('/support/tickets/:id', adminController.updateTicketStatus);

// User Core Management
router.get('/users', adminController.getUsers);
router.post('/users/:id/action', adminController.manageUser);

module.exports = router;