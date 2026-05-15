const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware');
const referralController = require('../controllers/referralController');

// @route GET /api/referrals/network
router.get('/network', auth, referralController.getNetwork);

module.exports = router;