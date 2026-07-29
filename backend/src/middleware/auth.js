const { verifyAccessToken } = require('../utils/jwt');
const db = require('../db');

async function authenticateToken(req, res, next) {
  // Parse cookies manually if not already parsed
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
  }

  // Check Bearer header, Cookie, or Query param
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : (cookies.accessToken || req.query.token);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: 'Invalid or expired access token.' });
  }

  // Verify token version in database (revocation check)
  try {
    const table = decoded.role === 'MANAGER' ? 'managers' : 'field_officers';
    const userRes = await db.query(`SELECT token_version FROM ${table} WHERE id = $1`, [decoded.id]);
    
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    const currentVersion = userRes.rows[0].token_version || 1;
    const tokenVersion = decoded.tokenVersion || 1;

    if (currentVersion !== tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session has been revoked or expired. Please log in again.' });
    }
  } catch (err) {
    // For local dev/mock fallback connectivity, don't crash
    console.error('Token version check warning:', err.message);
  }

  req.user = decoded;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
