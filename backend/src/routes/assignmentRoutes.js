const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, requireRole('MANAGER'), managerController.getAssignments);
router.post('/', authenticateToken, requireRole('MANAGER'), managerController.createAssignment);
router.delete('/:id', authenticateToken, requireRole('MANAGER'), managerController.deleteAssignment);

module.exports = router;
