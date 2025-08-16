import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { 
    socket, 
    isConnected, 
    joinConversation, 
    leaveConversation,
    onNewMessage,
    onUserTyping,
    onUserStoppedTyping,
    onUserStatusChanged,
    offNewMessage,
    offUserTyping,
    offUserStoppedTyping,
    offUserStatusChanged
  } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Fetch conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected()) return;

    const handleNewMessage = (message) => {
      setMessages(prev => {
        // Check if message already exists
        if (prev.find(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Update conversation list with new message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === message.conversationId 
            ? { ...conv, last_message: message.content, last_message_time: message.createdAt }
            : conv
        )
      );
    };

    const handleUserTyping = (data) => {
      if (data.conversationId === currentConversation?.id) {
        setTypingUsers(prev => new Set(prev).add(data.username));
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.conversationId === currentConversation?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.username);
          return newSet;
        });
      }
    };

    const handleUserStatusChanged = (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.status === 'online') {
          newSet.add(data.username);
        } else {
          newSet.delete(data.username);
        }
        return newSet;
      });
    };

    // Set up event listeners
    onNewMessage(handleNewMessage);
    onUserTyping(handleUserTyping);
    onUserStoppedTyping(handleUserStoppedTyping);
    onUserStatusChanged(handleUserStatusChanged);

    // Cleanup
    return () => {
      offNewMessage();
      offUserTyping();
      offUserStoppedTyping();
      offUserStatusChanged();
    };
  }, [socket, isConnected, currentConversation, onNewMessage, onUserTyping, onUserStoppedTyping, onUserStatusChanged, offNewMessage, offUserTyping, offUserStoppedTyping, offUserStatusChanged]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId, limit = 50, offset = 0) => {
    try {
      const response = await axios.get(`/api/messages/${conversationId}`, {
        params: { limit, offset }
      });
      return response.data.messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      return [];
    }
  };

  const selectConversation = async (conversation) => {
    try {
      setCurrentConversation(conversation);
      setMessages([]);
      
      // Leave previous conversation if any
      if (currentConversation) {
        leaveConversation(currentConversation.id);
      }

      // Join new conversation
      if (conversation) {
        joinConversation(conversation.id);
        const messages = await fetchMessages(conversation.id);
        setMessages(messages);
      }
    } catch (error) {
      console.error('Error selecting conversation:', error);
    }
  };

  const sendMessage = async (content, messageType = 'text') => {
    if (!currentConversation || !content.trim()) return;

    try {
      const response = await axios.post(`/api/messages/${currentConversation.id}`, {
        content: content.trim(),
        messageType
      });

      // Add message to local state
      const newMessage = response.data.data;
      setMessages(prev => [...prev, newMessage]);

      // Update conversation list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversation.id 
            ? { ...conv, last_message: content, last_message_time: new Date().toISOString() }
            : conv
        )
      );

      return { success: true, message: newMessage };
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return { success: false, error: error.message };
    }
  };

  const createConversation = async (type, participantIds, name = null) => {
    try {
      const response = await axios.post('/api/conversations', {
        type,
        participantIds,
        name
      });

      const newConversation = response.data.conversation;
      setConversations(prev => [newConversation, ...prev]);
      
      // Auto-select new conversation
      selectConversation(newConversation);
      
      toast.success('Conversation created successfully');
      return { success: true, conversation: newConversation };
    } catch (error) {
      console.error('Error creating conversation:', error);
      const message = error.response?.data?.error || 'Failed to create conversation';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const searchMessages = async (query, conversationId = null) => {
    try {
      const targetConversationId = conversationId || currentConversation?.id;
      if (!targetConversationId) return [];

      const response = await axios.get(`/api/messages/search/${targetConversationId}`, {
        params: { q: query }
      });

      return response.data.messages;
    } catch (error) {
      console.error('Error searching messages:', error);
      toast.error('Failed to search messages');
      return [];
    }
  };

  const updateUserStatus = (status) => {
    // This will be handled by the socket context
    // but we can update local state immediately for better UX
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      if (status === 'online') {
        newSet.add(user.username);
      } else {
        newSet.delete(user.username);
      }
      return newSet;
    });
  };

  const value = {
    conversations,
    currentConversation,
    messages,
    loading,
    typingUsers,
    onlineUsers,
    selectConversation,
    sendMessage,
    createConversation,
    searchMessages,
    updateUserStatus,
    fetchConversations,
    fetchMessages
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 