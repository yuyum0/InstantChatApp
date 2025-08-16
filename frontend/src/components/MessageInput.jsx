import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';

const MessageInput = ({ conversationId, onTyping }) => {
  const [message, setMessage] = useState('');
  const { sendMessage } = useChat();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const result = await sendMessage(message.trim());
    if (result.success) {
      setMessage('');
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    onTyping();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-3">
      <div className="flex-1">
        <textarea
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          rows="1"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
      </div>
      
      <button
        type="submit"
        disabled={!message.trim()}
        className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  );
};

export default MessageInput; 