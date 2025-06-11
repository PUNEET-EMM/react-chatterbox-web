
import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type: 'text' | 'image';
  media_url?: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={{
            id: message.id,
            senderId: message.sender_id,
            content: message.content,
            timestamp: new Date(message.created_at),
            type: message.message_type,
            mediaUrl: message.media_url,
            senderName: message.profiles.display_name,
            senderAvatar: message.profiles.avatar_url || ''
          }} 
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
