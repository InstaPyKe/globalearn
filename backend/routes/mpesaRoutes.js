const express = require('express');
const router = express.Router();
const { generateToken, stkPush, mpesaCallback } = require('../controllers/mpesaController');

// Route to kickstart an STK push transaction
router.post('/stk-push', generateToken, stkPush);

// Public webhook route that Safaricom calls when the user enters their PIN
// This route does NOT need authentication as Safaricom's servers call it directly.
router.post('/callback', mpesaCallback);

module.exports = router;