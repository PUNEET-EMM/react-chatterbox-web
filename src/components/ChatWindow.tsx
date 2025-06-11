
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatInfo } from '@/hooks/useChatInfo';
import { useMessages } from '@/hooks/useMessages';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ImageUploader from './ImageUploader';

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const [showImageUploader, setShowImageUploader] = useState(false);
  const { user } = useAuth();
  const { chatInfo } = useChatInfo(chatId, user?.id);
  const { messages, sendMessage } = useMessages(chatId);

  const handleSendMessage = async (message: string) => {
    if (!user) return false;
    return await sendMessage(message, user.id);
  };

  const handleImageUpload = async (imageUrl: string) => {
    if (!user) return;

    const success = await sendMessage('Image', user.id, 'image', imageUrl);
    if (success) {
      setShowImageUploader(false);
    }
  };

  if (!chatInfo) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    );
  }

  const displayName = chatInfo.is_group 
    ? chatInfo.name 
    : chatInfo.otherParticipant?.display_name || 'Unknown User';
  
  const avatarUrl = chatInfo.is_group 
    ? '' 
    : chatInfo.otherParticipant?.avatar_url;
  
  const status = chatInfo.is_group 
    ? 'Group Chat' 
    : chatInfo.otherParticipant?.status || 'Offline';

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <ChatHeader 
        displayName={displayName}
        avatarUrl={avatarUrl}
        status={status}
      />
      
      <MessageList messages={messages} />
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        onShowImageUploader={() => setShowImageUploader(true)}
      />

      {showImageUploader && (
        <ImageUploader
          onUpload={handleImageUpload}
          onClose={() => setShowImageUploader(false)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
