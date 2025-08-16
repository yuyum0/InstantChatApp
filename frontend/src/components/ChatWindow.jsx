import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';

const ChatWindow = ({ conversation, onToggleSidebar, sidebarOpen }) => {
  const { messages, typingUsers } = useChat();
  const { startTyping, stopTyping } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Handle typing indicators
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(conversation.id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(conversation.id);
    }, 1000);
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Stop typing when component unmounts or conversation changes
  useEffect(() => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping(conversation.id);
    }
  }, [conversation.id, isTyping, stopTyping]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <ChatHeader 
        conversation={conversation}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen={sidebarOpen}
        typingUsers={typingUsers}
      />

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages}
          conversationId={conversation.id}
        />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <MessageInput 
          conversationId={conversation.id}
          onTyping={handleTyping}
        />
      </div>
    </div>
  );
};

export default ChatWindow; 