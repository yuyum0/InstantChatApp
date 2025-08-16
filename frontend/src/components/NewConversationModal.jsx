import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const NewConversationModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { createConversation } = useChat();
  const [conversationType, setConversationType] = useState('direct');
  const [conversationName, setConversationName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setAvailableUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (conversationType === 'direct' && selectedUsers.length !== 1) {
      toast.error('Direct conversations must have exactly one other participant');
      return;
    }
    
    if (conversationType === 'group' && selectedUsers.length === 0) {
      toast.error('Group conversations must have at least one participant');
      return;
    }
    
    if (conversationType === 'group' && !conversationName.trim()) {
      toast.error('Group conversations must have a name');
      return;
    }

    setLoading(true);
    
    try {
      const result = await createConversation(
        conversationType,
        selectedUsers,
        conversationType === 'group' ? conversationName : null
      );
      
      if (result.success) {
        onClose();
        // Reset form
        setConversationType('direct');
        setConversationName('');
        setSelectedUsers([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(userItem => 
    userItem.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    userItem.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">New Conversation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Conversation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="direct"
                    checked={conversationType === 'direct'}
                    onChange={(e) => setConversationType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Direct Message</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="group"
                    checked={conversationType === 'group'}
                    onChange={(e) => setConversationType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Group Chat</span>
                </label>
              </div>
            </div>

            {/* Group Name (only for group chats) */}
            {conversationType === 'group' && (
              <div>
                <label htmlFor="conversationName" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  id="conversationName"
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  className="input-field"
                  placeholder="Enter group name"
                  maxLength={100}
                />
              </div>
            )}

            {/* User Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Participants
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field mb-3"
                placeholder="Search users..."
              />
              
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    {searchQuery ? 'No users found' : 'No users available'}
                  </p>
                ) : (
                  filteredUsers.map(userItem => (
                    <label key={userItem.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(userItem.id)}
                        onChange={() => handleUserToggle(userItem.id)}
                        className="mr-3"
                      />
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {userItem.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{userItem.username}</p>
                          <p className="text-xs text-gray-500">{userItem.email}</p>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              
              {selectedUsers.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || 
                  (conversationType === 'direct' && selectedUsers.length !== 1) ||
                  (conversationType === 'group' && (selectedUsers.length === 0 || !conversationName.trim()))
                }
                className="flex-1 btn-primary"
              >
                {loading ? 'Creating...' : 'Create Conversation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal; 