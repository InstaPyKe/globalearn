const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware');
const taskController = require('../controllers/taskController');

router.get('/available', auth, taskController.getAvailableTasks);
router.post('/complete', auth, taskController.completeTask);

module.exports = router;