const express = require('express');
const { protect, isManager } = require('../middleware/authMiddleware');
const rosterController = require('../controllers/rosterController');

const router = express.Router();

router.get('/fulfillment', protect, isManager, rosterController.getFulfillmentStatus);
router.get('/suggestions', protect, isManager, rosterController.getSuggestions);
router.post('/apply-suggestions', protect, isManager, rosterController.applySuggestions);

module.exports = router;
