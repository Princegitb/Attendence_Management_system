const express = require('express');
const router = express.Router();
const fs = require('fs');
const { getLocalPhotoPath } = require('../utils/storage');
const { authenticateToken } = require('../middleware/auth');

/**
 * Route for serving attendance photos, requiring authentication
 */
router.get('/photo', authenticateToken, (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ success: false, message: 'Photo key is required.' });
  }

  const keyRegex = /^guard_att_\d+_[a-z0-9]{1,16}\.(jpg|jpeg|png|webp)$/i;
  if (!keyRegex.test(key)) {
    return res.status(400).json({ success: false, message: 'Invalid photo key format.' });
  }

  const filePath = getLocalPhotoPath(key);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Photo file not found.' });
  }

  return res.sendFile(filePath);
});

module.exports = router;
