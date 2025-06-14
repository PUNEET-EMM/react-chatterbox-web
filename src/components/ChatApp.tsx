
import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ProfileSettings from './ProfileSettings';
import NotificationContainer from './NotificationContainer';

const ChatApp: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="h-screen bg-gray-100 flex relative">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white border-r border-gray-300 flex flex-col">
        <Sidebar
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onShowProfile={() => setShowProfile(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatWindow chatId={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">Welcome to ChatApp</h2>
              <p className="text-gray-500">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      {showProfile && (
        <ProfileSettings onClose={() => setShowProfile(false)} />
      )}

      {/* Notification Container */}
      <NotificationContainer />
    </div>
  );
};

export default ChatApp;
