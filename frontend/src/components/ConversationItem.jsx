import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const ConversationItem = ({ conversation, isActive, onClick }) => {
  const getConversationName = () => {
    if (conversation.name) {
      return conversation.name;
    }
    
    // For direct conversations, show other participant's name
    if (conversation.participants && conversation.participants.length > 0) {
      return conversation.participants
        .filter(p => p.username !== conversation.currentUser)
        .map(p => p.username)
        .join(', ');
    }
    
    return 'Unknown';
  };

  const getConversationAvatar = () => {
    if (conversation.name) {
      // Group chat - show first letter of name
      return conversation.name.charAt(0).toUpperCase();
    }
    
    // Direct chat - show first letter of other participant's name
    if (conversation.participants && conversation.participants.length > 0) {
      const otherParticipant = conversation.participants
        .find(p => p.username !== conversation.currentUser);
      return otherParticipant?.username?.charAt(0).toUpperCase() || '?';
    }
    
    return '?';
  };

  const getLastMessagePreview = () => {
    if (!conversation.last_message) {
      return 'No messages yet';
    }
    
    const maxLength = 50;
    if (conversation.last_message.length <= maxLength) {
      return conversation.last_message;
    }
    
    return conversation.last_message.substring(0, maxLength) + '...';
  };

  const getLastMessageTime = () => {
    if (!conversation.last_message_time) {
      return '';
    }
    
    try {
      return formatDistanceToNow(new Date(conversation.last_message_time), { 
        addSuffix: true,
        includeSeconds: true
      });
    } catch (error) {
      return '';
    }
  };

  const getUnreadCount = () => {
    return conversation.unread_count || 0;
  };

  return (
    <div
      onClick={onClick}
      className={`
        sidebar-item ${isActive ? 'active' : ''}
        cursor-pointer transition-all duration-200
        hover:bg-gray-50 ${isActive ? 'bg-primary-50' : ''}
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-sm">
          {getConversationAvatar()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
            {getConversationName()}
          </p>
          <span className="text-xs text-gray-500">
            {getLastMessageTime()}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs truncate ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
            {getLastMessagePreview()}
          </p>
          
          {/* Unread count */}
          {getUnreadCount() > 0 && (
            <span className="flex-shrink-0 ml-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getUnreadCount() > 99 ? '99+' : getUnreadCount()}
            </span>
          )}
        </div>
      </div>

      {/* Type indicator */}
      <div className="flex-shrink-0 ml-2">
        {conversation.type === 'group' && (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default ConversationItem; 