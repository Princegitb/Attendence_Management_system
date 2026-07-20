const express = require('express');
const multer = require('multer');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Manager-only Guard routes
router.get('/', authenticateToken, requireRole('MANAGER'), managerController.getGuards);
router.post('/', authenticateToken, requireRole('MANAGER'), managerController.createGuard);
router.put('/:id', authenticateToken, requireRole('MANAGER'), managerController.updateGuard);
router.delete('/:id', authenticateToken, requireRole('MANAGER'), managerController.deleteGuard);

// Bulk Import & Template
router.get('/import/template', authenticateToken, requireRole('MANAGER'), managerController.downloadExcelTemplate);
router.post('/import', authenticateToken, requireRole('MANAGER'), upload.single('file'), managerController.importGuardsBulk);

module.exports = router;
