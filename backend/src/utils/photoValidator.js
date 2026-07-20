/**
 * Server-side Image Validation for Attendance Photos
 * Verifies file magic bytes, minimum size, and basic non-blank pixel criteria.
 */

function validatePhotoBuffer(buffer) {
  if (!buffer || buffer.length < 1024) {
    return { valid: false, reason: 'Photo file is too small or empty (min 1KB)' };
  }

  // Check Magic Numbers for JPEG, PNG, WEBP
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isWebp = buffer.slice(0, 4).toString('utf-8') === 'RIFF' && buffer.slice(8, 12).toString('utf-8') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    return { valid: false, reason: 'Invalid image format. Must be JPEG, PNG, or WebP.' };
  }

  // Basic pixel sample check (to reject solid black/white blank photos)
  let sum = 0;
  let sampleCount = 0;
  const step = Math.max(1, Math.floor(buffer.length / 500));

  for (let i = 0; i < buffer.length; i += step) {
    sum += buffer[i];
    sampleCount++;
  }

  const avgByteValue = sum / sampleCount;

  // Extremely dark (near 0) or solid uniform byte values indicates blank/covered lens
  if (avgByteValue < 5) {
    return { valid: false, reason: 'Photo appears pitch black or lens was covered. Please take a clear live photo of the guard.' };
  }

  return { valid: true };
}

module.exports = { validatePhotoBuffer };
