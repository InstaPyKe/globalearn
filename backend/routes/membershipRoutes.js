const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware');
const membershipController = require('../controllers/membershipController');

router.post('/upgrade', auth, membershipController.requestUpgrade);

module.exports = router;