
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatInfo } from '@/hooks/useChatInfo';
import { useMessages } from '@/hooks/useMessages';
import { useSimpleCalls } from '@/hooks/useSimpleCalls';
import { useNotifications } from '@/hooks/useNotifications';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ImageUploader from './ImageUploader';
import SimpleCallWindow from './SimpleCallWindow';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const [showImageUploader, setShowImageUploader] = useState(false);
  const { user } = useAuth();
  const { chatInfo } = useChatInfo(chatId, user?.id);
  const { messages, sendMessage } = useMessages(chatId, user?.id);
  const { activeCall, initiateCall, endCall } = useSimpleCalls();
  const { addNotification } = useNotifications();
  const { toast } = useToast();

  const handleSendMessage = async (message: string) => {
    if (!user) return false;
    const success = await sendMessage(message, user.id);
    
    // Show notification for new message
    if (success && chatInfo?.otherParticipant) {
      addNotification({
        type: 'message',
        title: chatInfo.otherParticipant.display_name,
        message: message.length > 50 ? message.substring(0, 50) + '...' : message,
        avatar: chatInfo.otherParticipant.avatar_url,
        autoClose: 3000
      });
    }
    
    return success;
  };

  const handleSendAudio = async (audioUrl: string) => {
    if (!user) return false;
    return await sendMessage('Audio message', user.id, 'audio', audioUrl);
  };

  const handleImageUpload = async (imageUrl: string) => {
    if (!user) return;

    const success = await sendMessage('Image', user.id, 'image', imageUrl);
    if (success) {
      setShowImageUploader(false);
    }
  };

  const handleAudioCall = async () => {
    if (!user || !chatInfo?.otherParticipant) return;
    
    const call = initiateCall(chatInfo.otherParticipant.display_name, 'audio');
    if (!call) {
      toast({
        title: "Call Failed",
        description: "Unable to initiate call. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVideoCall = async () => {
    if (!user || !chatInfo?.otherParticipant) return;
    
    const call = initiateCall(chatInfo.otherParticipant.display_name, 'video');
    if (!call) {
      toast({
        title: "Call Failed",
        description: "Unable to initiate call. Please try again.",
        variant: "destructive"
      });
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
    <>
      <div className="flex-1 flex flex-col bg-gray-50 max-h-screen overflow-hidden">
        <ChatHeader 
          displayName={displayName}
          avatarUrl={avatarUrl}
          status={status}
          onAudioCall={!chatInfo.is_group ? handleAudioCall : undefined}
          onVideoCall={!chatInfo.is_group ? handleVideoCall : undefined}
        />
        
        <MessageList messages={messages} />
        
        <MessageInput 
          onSendMessage={handleSendMessage}
          onSendAudio={handleSendAudio}
          onShowImageUploader={() => setShowImageUploader(true)}
        />

        {showImageUploader && (
          <ImageUploader
            onUpload={handleImageUpload}
            onClose={() => setShowImageUploader(false)}
          />
        )}
      </div>

      {activeCall && (
        <SimpleCallWindow
          callType={activeCall.callType}
          callerName={activeCall.callerName}
          calleeName={activeCall.calleeName}
          isInitiator={activeCall.isInitiator}
          onEndCall={endCall}
        />
      )}
    </>
  );
};

export default ChatWindow;
