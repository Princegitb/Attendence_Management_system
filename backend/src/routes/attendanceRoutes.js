const express = require('express');
const multer = require('multer');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const managerController = require('../controllers/managerController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { attendanceRateLimiter } = require('../middleware/rateLimiter');

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max photo size
});

// Officer marking routes
router.post(
  '/check-in',
  authenticateToken,
  requireRole('OFFICER'),
  attendanceRateLimiter,
  upload.single('photo'),
  attendanceController.markCheckIn
);

router.post(
  '/check-out',
  authenticateToken,
  requireRole('OFFICER'),
  attendanceRateLimiter,
  upload.single('photo'),
  attendanceController.markCheckOut
);

// Manager monitoring & manual correction routes
router.get('/', authenticateToken, requireRole('MANAGER'), managerController.getAttendanceLogs);
router.put('/:id/correction', authenticateToken, requireRole('MANAGER'), managerController.correctAttendance);

module.exports = router;
