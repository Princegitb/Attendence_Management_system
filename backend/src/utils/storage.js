const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const provider = process.env.STORAGE_PROVIDER || 'db';

// Initialize Supabase Client if credentials are provided
let supabaseClient = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const rawUrl = process.env.SUPABASE_URL.trim();
  const cleanUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  console.log(`[STORAGE INIT] Raw URL: "${rawUrl}" | Clean URL: "${cleanUrl}"`);
  supabaseClient = createClient(cleanUrl, process.env.SUPABASE_SERVICE_ROLE_KEY.trim());
}

/**
 * Uploads photo buffer to storage (Supabase Storage Bucket, Cloudflare R2, or Base64 Fallback)
 * @returns {Promise<{ key: string, url: string }>}
 */
async function uploadPhoto(buffer, originalName = 'photo.jpg') {
  const filename = `guard_att_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.jpg`;

  // 1. Upload to Supabase Storage (Best zero-cost cloud option)
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.storage
        .from('guard-photos')
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('guard-photos')
        .getPublicUrl(filename);

      return {
        key: filename,
        url: publicUrl
      };
    } catch (supabaseError) {
      console.error('Supabase upload failed, falling back:', supabaseError.message);
    }
  }

  // 2. Fallback to Cloudflare R2 if client exists
  // (Left intact if you choose to activate it later)
  const provider = process.env.STORAGE_PROVIDER || 'db';
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

  // 3. Fallback to Base64 Database storage (for offline or local dev without credentials)
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
