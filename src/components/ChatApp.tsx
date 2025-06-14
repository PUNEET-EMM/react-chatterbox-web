
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
    <div className="h-screen flex relative bg-gradient-to-br from-green-50 via-blue-50 to-white dark:from-[#202b2e] dark:via-[#191928] dark:to-[#18181a] transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white/90 dark:bg-sidebar rounded-tr-3xl md:rounded-tr-[4rem] border-r border-gray-200 shadow-lg flex flex-col">
        <Sidebar
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onShowProfile={() => setShowProfile(true)}
        />
      </div>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChat ? (
          <ChatWindow chatId={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-[#18181a] dark:to-[#202b2e] animate-fade-in">
            <div className="text-center">
              <MessageSquare className="h-24 w-24 text-green-400 mx-auto mb-4 drop-shadow-lg animate-pulse" />
              <h2 className="text-3xl font-bold text-gray-700 dark:text-gray-100 mb-2 tracking-tight font-[Playfair Display]">Welcome to ChatApp</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Select a chat to start messaging</p>
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
