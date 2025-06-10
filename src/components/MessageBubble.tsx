
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image';
  mediaUrl?: string;
  senderName: string;
  senderAvatar: string;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const isMe = message.senderId === user?.id;
  
  const timeString = message.timestamp.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div className={`flex items-start space-x-2 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {!isMe && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.senderAvatar} />
          <AvatarFallback>{message.senderName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-xs lg:max-w-md ${isMe ? 'ml-12' : 'mr-12'}`}>
        {!isMe && (
          <p className="text-xs text-gray-600 mb-1 ml-2">{message.senderName}</p>
        )}
        
        <div
          className={`px-4 py-2 rounded-2xl shadow-sm ${
            isMe
              ? 'bg-green-500 text-white rounded-tr-md'
              : 'bg-white text-gray-800 rounded-tl-md border border-gray-200'
          }`}
        >
          {message.type === 'image' ? (
            <div className="space-y-2">
              <img
                src={message.mediaUrl || message.content}
                alt="Shared image"
                className="max-w-full h-auto rounded-lg"
                style={{ maxHeight: '300px' }}
              />
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          
          <p className={`text-xs mt-1 ${isMe ? 'text-green-100' : 'text-gray-500'}`}>
            {timeString}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
