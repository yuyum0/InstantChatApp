import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import NewConversationModal from '../components/NewConversationModal';

const Chat = () => {
  const { user, logout } = useAuth();
  const { currentConversation } = useChat();
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen bg-chat-bg">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onCreateConversation={() => setShowNewConversation(true)}
        onLogout={handleLogout}
        user={user}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <ChatWindow 
            conversation={currentConversation}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">
                Welcome to InstantChat!
              </h2>
              <p className="text-gray-500 mb-4">
                Select a conversation from the sidebar or create a new one to start chatting.
              </p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="btn-primary"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <NewConversationModal
          isOpen={showNewConversation}
          onClose={() => setShowNewConversation(false)}
        />
      )}
    </div>
  );
};

export default Chat; 