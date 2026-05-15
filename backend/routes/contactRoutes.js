const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Public route to submit messages
router.post('/submit', contactController.submitMessage);

// Admin route to view messages (Add admin auth middleware here in production)
router.get('/all', contactController.getAllMessages);

// Update message status
router.patch('/:id/status', contactController.updateMessageStatus);

// Delete message
router.delete('/:id', contactController.deleteMessage);

module.exports = router;