const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');

const router = express.Router();

/**
 * @route   GET /api/conversations
 * @desc    Get all conversations for current user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const conversationsResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.type,
        c.created_at,
        c.updated_at,
        (
          SELECT m.content 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          AND m.sender_id != $1
          AND m.created_at > (
            SELECT COALESCE(MAX(m2.created_at), '1970-01-01'::timestamp)
            FROM messages m2
            WHERE m2.conversation_id = c.id
            AND m2.sender_id = $1
          )
        ) as unread_count
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
      ORDER BY c.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    // Get participants for each conversation
    const conversationsWithParticipants = await Promise.all(
      conversationsResult.rows.map(async (conversation) => {
        const participantsResult = await query(`
          SELECT 
            u.id, 
            u.username, 
            u.avatar_url, 
            u.status,
            cp.role
          FROM conversation_participants cp
          INNER JOIN users u ON cp.user_id = u.id
          WHERE cp.conversation_id = $1
          ORDER BY cp.joined_at
        `, [conversation.id]);

        return {
          ...conversation,
          participants: participantsResult.rows
        };
      })
    );

    res.json({
      conversations: conversationsWithParticipants,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: conversationsWithParticipants.length
      }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * @route   GET /api/conversations/:id
 * @desc    Get conversation by ID with participants
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is participant
    const participantResult = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Get conversation details
    const conversationResult = await query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get participants
    const participantsResult = await query(`
      SELECT 
        u.id, 
        u.username, 
        u.avatar_url, 
        u.status,
        cp.role,
        cp.joined_at
      FROM conversation_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = $1
      ORDER BY cp.joined_at
    `, [id]);

    const conversation = {
      ...conversationResult.rows[0],
      participants: participantsResult.rows
    };

    res.json({ conversation });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * @route   POST /api/conversations
 * @desc    Create new conversation (1:1 or group)
 * @access  Private
 */
router.post('/', [
  body('type').isIn(['direct', 'group']).withMessage('Type must be direct or group'),
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters')
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

    const { type, participantIds, name } = req.body;

    // For direct conversations, check if it already exists
    if (type === 'direct' && participantIds.length === 1) {
      const existingConversation = await query(`
        SELECT c.id 
        FROM conversations c
        INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
        INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
        WHERE c.type = 'direct'
        AND cp1.user_id = $1
        AND cp2.user_id = $2
      `, [req.user.id, participantIds[0]]);

      if (existingConversation.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Direct conversation already exists',
          conversationId: existingConversation.rows[0].id
        });
      }
    }

    // Validate all participant IDs exist
    const participantIdsWithCurrent = [req.user.id, ...participantIds];
    const uniqueParticipantIds = [...new Set(participantIdsWithCurrent)];

    const usersResult = await query(
      'SELECT id FROM users WHERE id = ANY($1)',
      [uniqueParticipantIds]
    );

    if (usersResult.rows.length !== uniqueParticipantIds.length) {
      return res.status(400).json({ error: 'One or more participants not found' });
    }

    // Use transaction for creating conversation and participants
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Create conversation
      const conversationResult = await client.query(
        `INSERT INTO conversations (name, type) 
         VALUES ($1, $2) 
         RETURNING *`,
        [name || null, type]
      );

      const conversation = conversationResult.rows[0];

      // Add participants
      for (const participantId of uniqueParticipantIds) {
        const role = participantId === req.user.id ? 'admin' : 'member';
        await client.query(
          'INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES ($1, $2, $3)',
          [conversation.id, participantId, role]
        );
      }

      await client.query('COMMIT');

      // Get conversation with participants
      const participantsResult = await query(`
        SELECT 
          u.id, 
          u.username, 
          u.avatar_url, 
          u.status,
          cp.role
        FROM conversation_participants cp
        INNER JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = $1
        ORDER BY cp.joined_at
      `, [conversation.id]);

      const conversationWithParticipants = {
        ...conversation,
        participants: participantsResult.rows
      };

      res.status(201).json({
        message: 'Conversation created successfully',
        conversation: conversationWithParticipants
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * @route   PUT /api/conversations/:id
 * @desc    Update conversation (name for group chats)
 * @access  Private
 */
router.put('/:id', [
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if user is admin
    const adminResult = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND role = $3',
      [id, req.user.id, 'admin']
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Update conversation
    const updateResult = await query(
      'UPDATE conversations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      message: 'Conversation updated successfully',
      conversation: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * @route   DELETE /api/conversations/:id
 * @desc    Delete conversation (admin only)
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const adminResult = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND role = $3',
      [id, req.user.id, 'admin']
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Delete conversation (cascade will handle participants and messages)
    await query('DELETE FROM conversations WHERE id = $1', [id]);

    res.json({ message: 'Conversation deleted successfully' });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * @route   POST /api/conversations/:id/participants
 * @desc    Add participant to conversation
 * @access  Private
 */
router.post('/:id/participants', [
  body('userId').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if user is admin
    const adminResult = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND role = $3',
      [id, req.user.id, 'admin']
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if user is already a participant
    const existingParticipant = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingParticipant.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a participant' });
    }

    // Add participant
    await query(
      'INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES ($1, $2, $3)',
      [id, userId, 'member']
    );

    res.json({ message: 'Participant added successfully' });

  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

/**
 * @route   DELETE /api/conversations/:id/participants/:userId
 * @desc    Remove participant from conversation
 * @access  Private
 */
router.delete('/:id/participants/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if user is admin or removing themselves
    const participantResult = await query(
      'SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    const isAdmin = participantResult.rows[0].role === 'admin';
    const isRemovingSelf = parseInt(userId) === req.user.id;

    if (!isAdmin && !isRemovingSelf) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Remove participant
    await query(
      'DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Participant removed successfully' });

  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

module.exports = router; 