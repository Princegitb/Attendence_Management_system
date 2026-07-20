const express = require('express');
const router = express.Router();
const path = require('path');
const { getLocalPhotoPath } = require('../utils/storage');
const { authenticateToken } = require('../middleware/auth');

/**
 * Authenticated proxy route for serving attendance photos
 * Ensures object storage / uploads remain private and unexposed to unauthorized users
 */
router.get('/photo', authenticateToken, (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ success: false, message: 'Photo key is required.' });
  }

  const filePath = getLocalPhotoPath(key);
  if (!filePath) {
    return res.status(404).json({ success: false, message: 'Photo not found.' });
  }

  return res.sendFile(filePath);
});

module.exports = router;
