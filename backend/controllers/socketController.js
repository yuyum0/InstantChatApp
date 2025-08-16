const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Store active user connections
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

/**
 * Setup Socket.IO event handlers
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const setupSocketHandlers = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists
      const userResult = await query(
        'SELECT id, username, status FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.username = userResult.rows[0].username;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.username} (${socket.userId}) connected`);

    // Store user connection
    activeUsers.set(socket.userId, socket.id);
    userSockets.set(socket.id, socket.userId);

    // Update user status to online
    updateUserStatus(socket.userId, 'online');

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle user joining conversations
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Check if user is participant in conversation
        const participantResult = await query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );

        if (participantResult.rows.length > 0) {
          socket.join(`conversation_${conversationId}`);
          socket.emit('conversation_joined', { conversationId });
          console.log(`👥 User ${socket.username} joined conversation ${conversationId}`);
        } else {
          socket.emit('error', { message: 'Not a participant in this conversation' });
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving conversations
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      socket.emit('conversation_left', { conversationId });
      console.log(`👋 User ${socket.username} left conversation ${conversationId}`);
    });

    // Handle new messages
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageType = 'text' } = data;

        // Validate user is participant
        const participantResult = await query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );

        if (participantResult.rows.length === 0) {
          socket.emit('error', { message: 'Not a participant in this conversation' });
          return;
        }

        // Save message to database
        const messageResult = await query(
          `INSERT INTO messages (conversation_id, sender_id, content, message_type) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id, created_at`,
          [conversationId, socket.userId, content, messageType]
        );

        const message = {
          id: messageResult.rows[0].id,
          conversationId,
          senderId: socket.userId,
          senderName: socket.username,
          content,
          messageType,
          createdAt: messageResult.rows[0].created_at
        };

        // Update conversation timestamp
        await query(
          'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [conversationId]
        );

        // Broadcast message to all participants in the conversation
        io.to(`conversation_${conversationId}`).emit('new_message', message);

        // Notify other participants (excluding sender)
        socket.to(`conversation_${conversationId}`).emit('message_notification', {
          conversationId,
          senderName: socket.username,
          preview: content.substring(0, 50)
        });

        console.log(`💬 Message sent in conversation ${conversationId} by ${socket.username}`);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('typing_stop', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle user status updates
    socket.on('update_status', async (status) => {
      try {
        await query(
          'UPDATE users SET status = $1 WHERE id = $2',
          [status, socket.userId]
        );

        // Broadcast status update to all connected users
        io.emit('user_status_changed', {
          userId: socket.userId,
          username: socket.username,
          status
        });

        console.log(`🔄 User ${socket.username} status changed to ${status}`);
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`🔌 User ${socket.username} (${socket.userId}) disconnected`);

      // Remove from active users
      activeUsers.delete(socket.userId);
      userSockets.delete(socket.id);

      // Update user status to offline
      await updateUserStatus(socket.userId, 'offline');

      // Notify other users about status change
      socket.broadcast.emit('user_status_changed', {
        userId: socket.userId,
        username: socket.username,
        status: 'offline'
      });
    });
  });
};

/**
 * Update user status in database
 * @param {number} userId - User ID
 * @param {string} status - New status
 */
const updateUserStatus = async (userId, status) => {
  try {
    await query(
      'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
      [status, userId]
    );
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

/**
 * Get active users count
 * @returns {number} Number of active users
 */
const getActiveUsersCount = () => {
  return activeUsers.size;
};

/**
 * Check if user is online
 * @param {number} userId - User ID
 * @returns {boolean} True if user is online
 */
const isUserOnline = (userId) => {
  return activeUsers.has(userId);
};

/**
 * Send message to specific user
 * @param {number} userId - Target user ID
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
const sendToUser = (userId, event, data) => {
  const socketId = activeUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

module.exports = {
  setupSocketHandlers,
  getActiveUsersCount,
  isUserOnline,
  sendToUser
}; 