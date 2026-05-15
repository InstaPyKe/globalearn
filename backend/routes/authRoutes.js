const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route POST api/auth/register
router.post('/register', authController.registerUser);

// @route POST api/auth/login
router.post('/login', authController.loginUser);

module.exports = router;