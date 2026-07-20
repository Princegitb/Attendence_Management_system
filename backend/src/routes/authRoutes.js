const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginRateLimiter, authController.login);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/refresh', authController.refreshTokenHandler);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
