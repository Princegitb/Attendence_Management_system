const dotenv = require('dotenv');

dotenv.config();

const provider = process.env.STORAGE_PROVIDER || 'db';

let s3Client = null;
if (provider === 'r2' && process.env.R2_ACCESS_KEY_ID) {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads photo buffer to storage (Database Base64 Data URL or Cloudflare R2)
 * @returns {Promise<{ key: string, url: string }>}
 */
async function uploadPhoto(buffer, originalName = 'photo.jpg') {
  const filename = `guard_att_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.jpg`;

  if (provider === 'r2' && s3Client) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const bucket = process.env.R2_BUCKET || 'guard-photos';
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: buffer,
      ContentType: 'image/jpeg',
    }));

    const publicUrl = process.env.R2_PUBLIC_URL || '';
    const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;

    return {
      key: filename,
      url: `${cleanPublicUrl}/${filename}`
    };
  }

  // Fallback to Base64 Database storage (prevents server crashes if R2 is not configured)
  const base64Url = `data:image/jpeg;base64,${buffer.toString('base64')}`;
  return {
    key: filename,
    url: base64Url
  };
}

function getLocalPhotoPath(key) {
  return null;
}

module.exports = {
  uploadPhoto,
  getLocalPhotoPath
};
