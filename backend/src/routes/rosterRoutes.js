const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const rosterController = require('../controllers/rosterController');

const router = express.Router();

router.get('/fulfillment', authenticateToken, requireRole('MANAGER'), rosterController.getFulfillmentStatus);
router.get('/suggestions', authenticateToken, requireRole('MANAGER'), rosterController.getSuggestions);
router.post('/apply-suggestions', authenticateToken, requireRole('MANAGER'), rosterController.applySuggestions);

module.exports = router;
