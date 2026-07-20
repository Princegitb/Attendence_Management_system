const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, managerController.getPosts);
router.post('/', authenticateToken, requireRole('MANAGER'), managerController.createPost);
router.put('/:id', authenticateToken, requireRole('MANAGER'), managerController.updatePost);

module.exports = router;
