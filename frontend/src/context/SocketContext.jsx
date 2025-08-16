import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (isAuthenticated && token && !socketRef.current) {
      connectSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token]);

  const connectSocket = () => {
    try {
      socketRef.current = io('http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      setupSocketEvents();
    } catch (error) {
      console.error('Socket connection error:', error);
      toast.error('Failed to connect to chat server');
    }
  };

  const setupSocketEvents = () => {
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Connected to chat server');
      reconnectAttempts.current = 0;
      toast.success('Connected to chat server');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat server:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        toast.error(`Connection failed, retrying... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
      } else {
        toast.error('Failed to connect to chat server after multiple attempts');
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Reconnected to chat server after', attemptNumber, 'attempts');
      toast.success('Reconnected to chat server');
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to chat server');
      toast.error('Failed to reconnect to chat server');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Socket error occurred');
    });
  };

  const joinConversation = (conversationId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave_conversation', conversationId);
    }
  };

  const sendMessage = (conversationId, content, messageType = 'text') => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_message', {
        conversationId,
        content,
        messageType
      });
    }
  };

  const startTyping = (conversationId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('typing_start', conversationId);
    }
  };

  const stopTyping = (conversationId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('typing_stop', conversationId);
    }
  };

  const updateStatus = (status) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('update_status', status);
    }
  };

  const onNewMessage = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('new_message', callback);
    }
  };

  const onMessageNotification = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('message_notification', callback);
    }
  };

  const onUserTyping = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_typing', callback);
    }
  };

  const onUserStoppedTyping = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_stopped_typing', callback);
    }
  };

  const onUserStatusChanged = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_status_changed', callback);
    }
  };

  const onConversationJoined = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('conversation_joined', callback);
    }
  };

  const onConversationLeft = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('conversation_left', callback);
    }
  };

  const offNewMessage = () => {
    if (socketRef.current) {
      socketRef.current.off('new_message');
    }
  };

  const offMessageNotification = () => {
    if (socketRef.current) {
      socketRef.current.off('message_notification');
    }
  };

  const offUserTyping = () => {
    if (socketRef.current) {
      socketRef.current.off('user_typing');
    }
  };

  const offUserStoppedTyping = () => {
    if (socketRef.current) {
      socketRef.current.off('user_stopped_typing');
    }
  };

  const offUserStatusChanged = () => {
    if (socketRef.current) {
      socketRef.current.off('user_status_changed');
    }
  };

  const offConversationJoined = () => {
    if (socketRef.current) {
      socketRef.current.off('conversation_joined');
    }
  };

  const offConversationLeft = () => {
    if (socketRef.current) {
      socketRef.current.off('conversation_left');
    }
  };

  const isConnected = () => {
    return socketRef.current && socketRef.current.connected;
  };

  const value = {
    socket: socketRef.current,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    updateStatus,
    onNewMessage,
    onMessageNotification,
    onUserTyping,
    onUserStoppedTyping,
    onUserStatusChanged,
    onConversationJoined,
    onConversationLeft,
    offNewMessage,
    offMessageNotification,
    offUserTyping,
    offUserStoppedTyping,
    offUserStatusChanged,
    offConversationJoined,
    offConversationLeft
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 