const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');

const router = express.Router();

/**
 * @route   GET /api/messages/:conversationId
 * @desc    Get messages for a conversation
 * @access  Private
 */
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0, before } = req.query;

    // Check if user is participant
    const participantResult = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, req.user.id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    let sql = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.message_type,
        m.file_url,
        m.is_edited,
        m.edited_at,
        m.created_at,
        u.username as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
    `;
    let params = [conversationId];
    let paramCount = 1;

    // Add timestamp filter if 'before' is provided
    if (before) {
      paramCount++;
      sql += ` AND m.created_at < $${paramCount}`;
      params.push(before);
    }

    // Add ordering and pagination
    paramCount++;
    sql += ` ORDER BY m.created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    if (offset > 0) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const messagesResult = await query(sql, params);

    // Get message reactions
    const messagesWithReactions = await Promise.all(
      messagesResult.rows.map(async (message) => {
        const reactionsResult = await query(`
          SELECT 
            mr.reaction,
            COUNT(*) as count,
            ARRAY_AGG(u.username) as users
          FROM message_reactions mr
          INNER JOIN users u ON mr.user_id = u.id
          WHERE mr.message_id = $1
          GROUP BY mr.reaction
        `, [message.id]);

        return {
          ...message,
          reactions: reactionsResult.rows
        };
      })
    );

    res.json({
      messages: messagesWithReactions.reverse(), // Reverse to get chronological order
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: messagesWithReactions.length,
        hasMore: messagesWithReactions.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * @route   POST /api/messages/:conversationId
 * @desc    Send a new message
 * @access  Private
 */
router.post('/:conversationId', [
  body('content').notEmpty().withMessage('Message content is required'),
  body('messageType').optional().isIn(['text', 'image', 'file']).withMessage('Invalid message type'),
  body('fileUrl').optional().isURL().withMessage('Invalid file URL')
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

    const { conversationId } = req.params;
    const { content, messageType = 'text', fileUrl } = req.body;

    // Check if user is participant
    const participantResult = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, req.user.id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Create message
    const messageResult = await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [conversationId, req.user.id, content, messageType, fileUrl || null]
    );

    // Update conversation timestamp
    await query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    // Get message with sender info
    const messageWithSender = await query(`
      SELECT 
        m.*,
        u.username as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `, [messageResult.rows[0].id]);

    const message = {
      ...messageWithSender.rows[0],
      reactions: []
    };

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @route   PUT /api/messages/:id
 * @desc    Edit a message
 * @access  Private
 */
router.put('/:id', [
  body('content').notEmpty().withMessage('Message content is required')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    // Get message and check ownership
    const messageResult = await query(
      'SELECT * FROM messages WHERE id = $1',
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    // Update message
    const updateResult = await query(
      `UPDATE messages 
       SET content = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [content, id]
    );

    res.json({
      message: 'Message updated successfully',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get message and check ownership
    const messageResult = await query(
      'SELECT * FROM messages WHERE id = $1',
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Delete message
    await query('DELETE FROM messages WHERE id = $1', [id]);

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * @route   POST /api/messages/:id/reactions
 * @desc    Add reaction to message
 * @access  Private
 */
router.post('/:id/reactions', [
  body('reaction').notEmpty().withMessage('Reaction is required')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    // Check if message exists
    const messageResult = await query(
      'SELECT 1 FROM messages WHERE id = $1',
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Add or update reaction
    await query(
      `INSERT INTO message_reactions (message_id, user_id, reaction) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (message_id, user_id, reaction) 
       DO NOTHING`,
      [id, req.user.id, reaction]
    );

    res.json({ message: 'Reaction added successfully' });

  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

/**
 * @route   DELETE /api/messages/:id/reactions/:reaction
 * @desc    Remove reaction from message
 * @access  Private
 */
router.delete('/:id/reactions/:reaction', async (req, res) => {
  try {
    const { id, reaction } = req.params;

    // Remove reaction
    await query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3',
      [id, req.user.id, reaction]
    );

    res.json({ message: 'Reaction removed successfully' });

  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

/**
 * @route   GET /api/messages/search/:conversationId
 * @desc    Search messages in a conversation
 * @access  Private
 */
router.get('/search/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check if user is participant
    const participantResult = await query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, req.user.id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Search messages using full-text search
    const searchResult = await query(`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.message_type,
        m.created_at,
        u.username as sender_name,
        u.avatar_url as sender_avatar,
        ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) as rank
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $2
      AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, m.created_at DESC
      LIMIT $3 OFFSET $4
    `, [q, conversationId, parseInt(limit), parseInt(offset)]);

    res.json({
      messages: searchResult.rows,
      query: q,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: searchResult.rows.length
      }
    });

  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

module.exports = router; 