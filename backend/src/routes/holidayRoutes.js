const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All holiday management routes are restricted to Managers
router.use(authenticateToken);
router.use(requireRole('MANAGER'));

router.post('/calendars', holidayController.createCalendar);
router.get('/calendars', holidayController.getCalendars);
router.put('/calendars/:id/publish', holidayController.publishCalendar);
router.post('/calendars/holidays', holidayController.addHoliday);
router.get('/calendars/:calendar_id/holidays', holidayController.getCalendarHolidays);
router.delete('/calendars/holidays/:id', holidayController.deleteHoliday);
router.post('/calendars/link-post', holidayController.linkPostToCalendar);
router.put('/floating/:id/approve', holidayController.approveFloatingHoliday);
router.get('/floating/requests', holidayController.getFloatingRequests);

module.exports = router;
