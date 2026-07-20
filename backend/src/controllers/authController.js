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
        `UPDATE field_officers SET password_hash = $1, must_change_password = FALSE WHERE id = $2`,
        [newHash, userId]
      );
    } else {
      await db.query(
        `UPDATE managers SET password_hash = $1 WHERE id = $2`,
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
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required.' });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
  }

  const newPayload = {
    id: decoded.id,
    name: decoded.name,
    mobile: decoded.mobile,
    role: decoded.role,
    mustChangePassword: decoded.mustChangePassword
  };

  const newAccessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  return res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }
  });
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

module.exports = {
  login,
  changePassword,
  refreshTokenHandler,
  getMe
};
