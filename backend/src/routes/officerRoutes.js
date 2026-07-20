const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Officer management for Manager
router.get('/', authenticateToken, requireRole('MANAGER'), managerController.getOfficers);
router.post('/', authenticateToken, requireRole('MANAGER'), managerController.createOfficer);
router.post('/:id/reset-password', authenticateToken, requireRole('MANAGER'), managerController.resetOfficerPassword);
router.delete('/:id', authenticateToken, requireRole('MANAGER'), managerController.deleteOfficer);

// Officer App checklist for logged-in Officer
router.get('/guards', authenticateToken, requireRole('OFFICER'), attendanceController.getOfficerGuardsChecklist);

module.exports = router;
