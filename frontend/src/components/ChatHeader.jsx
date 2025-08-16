import React from 'react';
import { useAuth } from '../context/AuthContext';

const ChatHeader = ({ conversation, onToggleSidebar, sidebarOpen, typingUsers }) => {
  const { user } = useAuth();

  const getConversationName = () => {
    if (conversation.name) {
      return conversation.name;
    }
    
    // For direct conversations, show other participant's name
    if (conversation.participants && conversation.participants.length > 0) {
      return conversation.participants
        .filter(p => p.username !== user?.username)
        .map(p => p.username)
        .join(', ');
    }
    
    return 'Unknown';
  };

  const getParticipantCount = () => {
    if (conversation.type === 'direct') {
      return 'Direct message';
    }
    
    if (conversation.participants) {
      const count = conversation.participants.length;
      return `${count} participant${count !== 1 ? 's' : ''}`;
    }
    
    return '';
  };

  const getTypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingList = Array.from(typingUsers);
    if (typingList.length === 1) {
      return `${typingList[0]} is typing...`;
    } else if (typingList.length === 2) {
      return `${typingList[0]} and ${typingList[1]} are typing...`;
    } else {
      return 'Several people are typing...';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      {/* Left side - Conversation info */}
      <div className="flex items-center space-x-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Conversation avatar */}
        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-lg">
            {getConversationName().charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Conversation details */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {getConversationName()}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {getParticipantCount()}
            </span>
            {conversation.type === 'group' && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                Group
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Actions and typing indicator */}
      <div className="flex items-center space-x-4">
        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            <span className="text-sm text-gray-500">
              {getTypingIndicator()}
            </span>
            <div className="flex space-x-1 ml-2">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader; 