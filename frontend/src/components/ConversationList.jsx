import React from 'react';
import { useChat } from '../context/ChatContext';
import ConversationItem from './ConversationItem';
import LoadingSpinner from './LoadingSpinner';

const ConversationList = ({ conversations, loading, searchQuery }) => {
  const { currentConversation, selectConversation } = useChat();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="sm" text="Loading conversations..." />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        {searchQuery ? (
          <div>
            <p className="text-gray-500 text-sm">No conversations found for "{searchQuery}"</p>
            <p className="text-gray-400 text-xs mt-2">Try a different search term</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-sm">No conversations yet</p>
            <p className="text-gray-400 text-xs mt-2">Start a new conversation to begin chatting</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="py-2">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={currentConversation?.id === conversation.id}
          onClick={() => selectConversation(conversation)}
        />
      ))}
    </div>
  );
};

export default ConversationList; 