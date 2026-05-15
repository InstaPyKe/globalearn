const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware');
const spinController = require('../controllers/spinController');

router.post('/play', auth, spinController.performSpin);

module.exports = router;