const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const provider = process.env.STORAGE_PROVIDER || 'db';
const uploadsDir = path.join(__dirname, '../../uploads/photos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let s3Client = null;
if (provider === 's3' && process.env.S3_ACCESS_KEY_ID) {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads photo buffer to storage (Database Base64 Data URL, S3, or Local)
 * @returns {Promise<{ key: string, url: string }>}
 */
async function uploadPhoto(buffer, originalName = 'photo.jpg') {
  const fileExt = path.extname(originalName) || '.jpg';
  const filename = `guard_att_${Date.now()}_${Math.random().toString(36).substr(2, 8)}${fileExt}`;

  if (provider === 's3' && s3Client) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const bucket = process.env.S3_BUCKET || 'guard-photos';
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: buffer,
      ContentType: 'image/jpeg',
    }));

    return {
      key: filename,
      url: `/api/media/photo?key=${filename}`
    };
  }

  // Bulletproof Base64 Database Storage for zero-cost permanent persistence
  const base64Url = `data:image/jpeg;base64,${buffer.toString('base64')}`;

  // Also write to local disk as fallback if available
  try {
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.warn('Local disk write skipped:', err.message);
  }

  return {
    key: filename,
    url: base64Url
  };
}

function getLocalPhotoPath(key) {
  const safeKey = path.basename(key);
  const filePath = path.join(uploadsDir, safeKey);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

module.exports = {
  uploadPhoto,
  getLocalPhotoPath
};
