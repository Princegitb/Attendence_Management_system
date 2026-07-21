const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, managerController.getShifts);
router.post('/', authenticateToken, requireRole('MANAGER'), managerController.createShift);
router.delete('/:id', authenticateToken, requireRole('MANAGER'), managerController.deleteShift);

module.exports = router;
