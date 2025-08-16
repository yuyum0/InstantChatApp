const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (for user search)
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    
    let sql = `
      SELECT id, username, email, avatar_url, status, last_seen, created_at 
      FROM users 
      WHERE id != $1
    `;
    let params = [req.user.id];
    let paramCount = 1;

    // Add search filter if provided
    if (search) {
      paramCount++;
      sql += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Add pagination
    paramCount++;
    sql += ` ORDER BY username LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    if (offset > 0) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const usersResult = await query(sql, params);

    res.json({
      users: usersResult.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: usersResult.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      'SELECT id, username, email, avatar_url, status, last_seen, created_at FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userResult.rows[0] });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('avatar_url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL for avatar')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { username, email, avatar_url } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 0;

    // Build dynamic update query
    if (username !== undefined) {
      paramCount++;
      updates.push(`username = $${paramCount}`);
      params.push(username);
    }

    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      params.push(email);
    }

    if (avatar_url !== undefined) {
      paramCount++;
      updates.push(`avatar_url = $${paramCount}`);
      params.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add user ID to params
    paramCount++;
    params.push(req.user.id);

    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCount}
      RETURNING id, username, email, avatar_url, status, last_seen, created_at, updated_at
    `;

    const updateResult = await query(sql, params);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint === 'users_username_key') {
        return res.status(400).json({ error: 'Username already exists' });
      } else if (error.constraint === 'users_email_key') {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @route   PUT /api/users/password
 * @desc    Update current user password
 * @access  Private
 */
router.put('/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword, 
      userResult.rows[0].password_hash
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * @route   GET /api/users/online
 * @desc    Get online users count
 * @access  Private
 */
router.get('/online/count', async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE status = $1',
      ['online']
    );

    res.json({ onlineUsers: parseInt(result.rows[0].count) });

  } catch (error) {
    console.error('Error fetching online users count:', error);
    res.status(500).json({ error: 'Failed to fetch online users count' });
  }
});

module.exports = router; 