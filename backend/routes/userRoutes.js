const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware');
const userController = require('../controllers/userController');

// @route GET api/user/profile
router.get('/profile', auth, userController.getProfile);

module.exports = router;