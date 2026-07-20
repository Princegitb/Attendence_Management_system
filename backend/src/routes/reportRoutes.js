const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/export', authenticateToken, requireRole('MANAGER'), managerController.exportAttendanceReport);

module.exports = router;
