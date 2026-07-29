const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Login Handler (Supports both Manager and Field Officer via registered mobile number)
 */
async function login(req, res) {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: 'Mobile number and password are required.' });
    }

    const cleanMobile = mobile.toString().trim();

    // 1. Check Manager table
    let user = null;
    let role = 'MANAGER';

    const mgrRes = await db.query(`SELECT * FROM managers WHERE mobile = $1`, [cleanMobile]);
    if (mgrRes.rows.length > 0) {
      user = mgrRes.rows[0];
      role = 'MANAGER';
    } else {
      // 2. Check Field Officers table
      const officerRes = await db.query(`SELECT * FROM field_officers WHERE mobile = $1`, [cleanMobile]);
      if (officerRes.rows.length > 0) {
        user = officerRes.rows[0];
        role = 'OFFICER';
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password.' });
    }

    if (role === 'OFFICER' && user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Your Field Officer account is currently inactive. Contact Manager.' });
    }

    // Verify Password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password.' });
    }

    // Build JWT Payload
    const tokenPayload = {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: role,
      tokenVersion: user.token_version || 1,
      mustChangePassword: role === 'OFFICER' ? Boolean(user.must_change_password) : false
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await logAuditEvent({
      action: 'USER_LOGIN',
      performedBy: user.name,
      performedByRole: role,
      targetType: role === 'MANAGER' ? 'Manager' : 'FieldOfficer',
      targetId: user.id,
      reason: 'User logged in successfully'
    });

    // Set HTTP-Only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          role: role,
          mustChangePassword: tokenPayload.mustChangePassword
        },
        accessToken,
        refreshToken
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

/**
 * Mandatory Password Change for Field Officers
 */
async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new passwords are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const table = userRole === 'MANAGER' ? 'managers' : 'field_officers';
    const userRes = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [userId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    if (userRole === 'OFFICER') {
      await db.query(
        `UPDATE field_officers 
         SET password_hash = $1, must_change_password = FALSE, token_version = COALESCE(token_version, 1) + 1 
         WHERE id = $2`,
        [newHash, userId]
      );
    } else {
      await db.query(
        `UPDATE managers 
         SET password_hash = $1, token_version = COALESCE(token_version, 1) + 1 
         WHERE id = $2`,
        [newHash, userId]
      );
    }

    await logAuditEvent({
      action: 'CHANGE_PASSWORD',
      performedBy: req.user.name,
      performedByRole: userRole,
      targetType: userRole === 'MANAGER' ? 'Manager' : 'FieldOfficer',
      targetId: userId,
      reason: 'Password updated successfully'
    });

    return res.json({
      success: true,
      message: 'Password changed successfully. You may now access all features.'
    });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
}

/**
 * Token Refresh Handler
 */
async function refreshTokenHandler(req, res) {
  // Parse cookies manually if needed
  let refreshToken = req.body.refreshToken;
  if (!refreshToken && req.headers.cookie) {
    const cookies = {};
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
    refreshToken = cookies.refreshToken;
  }

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required.' });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
  }

  // Verify that the token version matches the DB version
  try {
    const table = decoded.role === 'MANAGER' ? 'managers' : 'field_officers';
    const userRes = await db.query(`SELECT token_version FROM ${table} WHERE id = $1`, [decoded.id]);
    
    if (userRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'User account not found.' });
    }

    const currentVersion = userRes.rows[0].token_version || 1;
    const tokenVersion = decoded.tokenVersion || 1;

    if (currentVersion !== tokenVersion) {
      return res.status(403).json({ success: false, message: 'Session has been revoked.' });
    }

    const newPayload = {
      id: decoded.id,
      name: decoded.name,
      mobile: decoded.mobile,
      role: decoded.role,
      tokenVersion: currentVersion,
      mustChangePassword: decoded.mustChangePassword
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    // Set new HTTP-Only cookies
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) {
    console.error('Refresh token error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during token refresh.' });
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res) {
  return res.json({
    success: true,
    data: req.user
  });
}

/**
 * Log out user and revoke all sessions
 */
async function logout(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const table = role === 'MANAGER' ? 'managers' : 'field_officers';
    
    // Revoke token version on server
    await db.query(`UPDATE ${table} SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1`, [userId]);
    
    // Clear cookies
    res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'None' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'None' });
    
    await logAuditEvent({
      action: 'USER_LOGOUT',
      performedBy: req.user.name,
      performedByRole: role,
      targetType: role === 'MANAGER' ? 'Manager' : 'FieldOfficer',
      targetId: userId,
      reason: 'User logged out successfully'
    });

    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Failed to log out.' });
  }
}

module.exports = {
  login,
  changePassword,
  refreshTokenHandler,
  getMe,
  logout
};
