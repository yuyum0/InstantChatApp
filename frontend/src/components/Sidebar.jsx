import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import ConversationList from './ConversationList';
import UserMenu from './UserMenu';
import SearchBar from './SearchBar';

const Sidebar = ({ isOpen, onToggle, onCreateConversation, onLogout, user }) => {
  const { conversations, loading } = useChat();
  const { isConnected } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    if (conv.name) {
      return conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    // For direct conversations, search in participant names
    return conv.participants?.some(participant => 
      participant.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 bg-chat-sidebar border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <h1 className="text-xl font-bold text-primary-900">InstantChat</h1>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Connection Status */}
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected() ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected() ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search conversations..."
            />
          </div>

          {/* New Conversation Button */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={onCreateConversation}
              className="w-full btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Conversation
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList 
              conversations={filteredConversations}
              loading={loading}
              searchQuery={searchQuery}
            />
          </div>

          {/* User Menu */}
          <div className="border-t border-gray-200">
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 