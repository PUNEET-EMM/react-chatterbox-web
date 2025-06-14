
import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import MessageDateDivider from './MessageDateDivider';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type: 'text' | 'image' | 'audio';
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

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const renderMessagesWithDividers = () => {
    const elements: React.ReactNode[] = [];
    let currentDate: Date | null = null;

    messages.forEach((message, index) => {
      const messageDate = new Date(message.created_at);
      
      // Add date divider if this is the first message or if the date changed
      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        elements.push(
          <MessageDateDivider key={`divider-${message.id}`} date={messageDate} />
        );
        currentDate = messageDate;
      }

      // Add the message
      elements.push(
        <MessageBubble 
          key={message.id} 
          message={{
            id: message.id,
            senderId: message.sender_id,
            content: message.content,
            timestamp: messageDate,
            type: message.message_type,
            mediaUrl: message.media_url,
            senderName: message.profiles.display_name,
            senderAvatar: message.profiles.avatar_url || ''
          }} 
        />
      );
    });

    return elements;
  };

  return (
    <div className="flex-1 overflow-y-scroll p-4 space-y-4">
      {renderMessagesWithDividers()}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
