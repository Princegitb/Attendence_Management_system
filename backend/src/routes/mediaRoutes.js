const express = require('express');
const router = express.Router();
const fs = require('fs');
const { getLocalPhotoPath } = require('../utils/storage');

/**
 * Public route for serving attendance photos in web dashboard <img> tags
 */
router.get('/photo', (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ success: false, message: 'Photo key is required.' });
  }

  const filePath = getLocalPhotoPath(key);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Photo file not found.' });
  }

  return res.sendFile(filePath);
});

module.exports = router;
