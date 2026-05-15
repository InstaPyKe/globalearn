const express = require('express');
const router = express.Router();
const auth = require('../config/authMiddleware');
const settingsController = require('../controllers/settingsController');
const upload = require('../config/multerConfig');

router.get('/me', auth, settingsController.getSettings);
router.post('/localization', auth, settingsController.updateLocalization);
router.post('/password', auth, settingsController.changePassword);
router.post('/2fa/toggle', auth, settingsController.toggle2FA);
router.post('/kyc/upload', auth, upload.single('kycDoc'), settingsController.submitKYC);

module.exports = router;