import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const MessageItem = ({ message, isOwn }) => {
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        includeSeconds: true
      });
    } catch (error) {
      return 'Just now';
    }
  };

  const getMessageContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            <img 
              src={message.file_url} 
              alt="Shared image" 
              className="max-w-xs rounded-lg"
            />
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">File attachment</span>
            </div>
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );
      
      default:
        return <p className="text-sm">{message.content}</p>;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender info for group chats */}
        {!isOwn && message.sender_name && (
          <p className="text-xs text-gray-500 mb-1 ml-2">
            {message.sender_name}
          </p>
        )}
        
        {/* Message bubble */}
        <div className={`
          message-bubble ${isOwn ? 'message-own' : 'message-other'}
          ${isOwn ? 'order-2' : 'order-1'}
        `}>
          {getMessageContent()}
          
          {/* Message metadata */}
          <div className={`flex items-center justify-end space-x-2 mt-2 text-xs ${
            isOwn ? 'text-primary-100' : 'text-gray-500'
          }`}>
            {message.is_edited && (
              <span className="italic">edited</span>
            )}
            <span>{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem; 