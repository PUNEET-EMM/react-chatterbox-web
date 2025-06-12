
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatInfo } from '@/hooks/useChatInfo';
import { useMessages } from '@/hooks/useMessages';
import { useCalls } from '@/hooks/useCalls';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ImageUploader from './ImageUploader';
import IncomingCallModal from './IncomingCallModal';
import CallWindow from './CallWindow';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const [showImageUploader, setShowImageUploader] = useState(false);
  const { user } = useAuth();
  const { chatInfo } = useChatInfo(chatId, user?.id);
  const { messages, sendMessage } = useMessages(chatId);
  const { incomingCall, activeCall, initiateCall, acceptCall, rejectCall, endCall } = useCalls(chatId);
  const { toast } = useToast();

  const handleSendMessage = async (message: string) => {
    if (!user) return false;
    return await sendMessage(message, user.id);
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
    
    const call = await initiateCall(chatInfo.otherParticipant.id, 'audio');
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
    
    const call = await initiateCall(chatInfo.otherParticipant.id, 'video');
    if (!call) {
      toast({
        title: "Call Failed",
        description: "Unable to initiate call. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAcceptCall = async () => {
    if (incomingCall) {
      await acceptCall(incomingCall.id);
    }
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      await rejectCall(incomingCall.id);
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      await endCall(activeCall.id);
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

      {incomingCall && (
        <IncomingCallModal
          isOpen={true}
          callerName={chatInfo.otherParticipant?.display_name || 'Unknown User'}
          callType={incomingCall.call_type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {activeCall && (
        <CallWindow
          callId={activeCall.id}
          isInitiator={activeCall.caller_id === user?.id}
          callType={activeCall.call_type}
          callerName={user?.user_metadata?.display_name || 'You'}
          calleeName={chatInfo.otherParticipant?.display_name || 'Unknown User'}
          onEndCall={handleEndCall}
          offer={activeCall.offer}
        />
      )}
    </>
  );
};

export default ChatWindow;
