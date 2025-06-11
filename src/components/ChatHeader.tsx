
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ChatHeaderProps {
  displayName: string;
  avatarUrl?: string;
  status: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ displayName, avatarUrl, status }) => {
  return (
    <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
      <Avatar>
        <AvatarImage src={avatarUrl || ''} />
        <AvatarFallback>
          {displayName.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <div>
        <h2 className="font-semibold text-gray-800">{displayName}</h2>
        <p className="text-sm text-green-600">{status}</p>
      </div>
    </div>
  );
};

export default ChatHeader;
