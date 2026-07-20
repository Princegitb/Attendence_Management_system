const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, requireRole('MANAGER'), managerController.getAuditLogs);

module.exports = router;
