const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware');
const transactionController = require('../controllers/transactionController');

// @route GET /api/transactions
// @desc Get all transactions for the authenticated user
// @access Private
router.get('/', auth, transactionController.getTransactions);

// @route POST /api/transactions/withdraw
router.post('/withdraw', auth, transactionController.requestWithdrawal);

module.exports = router;