
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CallButton from './CallButton';

interface ChatHeaderProps {
  displayName: string;
  avatarUrl?: string;
  status: string;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  displayName, 
  avatarUrl, 
  status,
  onAudioCall,
  onVideoCall
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">{status}</p>
        </div>
      </div>
      
      {onAudioCall && onVideoCall && (
        <CallButton
          onAudioCall={onAudioCall}
          onVideoCall={onVideoCall}
        />
      )}
    </div>
  );
};

export default ChatHeader;
