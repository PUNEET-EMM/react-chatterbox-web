
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Camera } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ImageUploader from './ImageUploader';

interface ChatWindowProps {
  chatId: string;
}

// Mock messages - replace with Supabase data
const mockMessages = {
  '1': [
    {
      id: '1',
      senderId: 'alice',
      content: 'Hey! How are you doing?',
      timestamp: new Date('2024-06-10T14:30:00'),
      type: 'text' as const,
      senderName: 'Alice Johnson',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
    },
    {
      id: '2',
      senderId: 'me',
      content: "I'm doing great! Thanks for asking. How about you?",
      timestamp: new Date('2024-06-10T14:32:00'),
      type: 'text' as const,
      senderName: 'Me',
      senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
    },
    {
      id: '3',
      senderId: 'alice',
      content: 'Pretty good! Working on some exciting projects.',
      timestamp: new Date('2024-06-10T14:35:00'),
      type: 'text' as const,
      senderName: 'Alice Johnson',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
    }
  ],
  '2': [
    {
      id: '4',
      senderId: 'bob',
      content: 'Can we meet tomorrow?',
      timestamp: new Date('2024-06-10T13:15:00'),
      type: 'text' as const,
      senderName: 'Bob Smith',
      senderAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150'
    }
  ],
  '3': [
    {
      id: '5',
      senderId: 'carol',
      content: 'Thanks for the help!',
      timestamp: new Date('2024-06-10T12:45:00'),
      type: 'text' as const,
      senderName: 'Carol Wilson',
      senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    }
  ]
};

const chatInfo = {
  '1': { name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', status: 'Available' },
  '2': { name: 'Bob Smith', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150', status: 'Busy' },
  '3': { name: 'Carol Wilson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', status: 'At work' }
};

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const [messages, setMessages] = useState(mockMessages[chatId as keyof typeof mockMessages] || []);
  const [newMessage, setNewMessage] = useState('');
  const [showImageUploader, setShowImageUploader] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChat = chatInfo[chatId as keyof typeof chatInfo];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now().toString(),
        senderId: 'me',
        content: newMessage,
        timestamp: new Date(),
        type: 'text' as const,
        senderName: 'Me',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
      };
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    const message = {
      id: Date.now().toString(),
      senderId: 'me',
      content: imageUrl,
      timestamp: new Date(),
      type: 'image' as const,
      senderName: 'Me',
      senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
    };
    
    setMessages(prev => [...prev, message]);
    setShowImageUploader(false);
  };

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
        <Avatar>
          <AvatarImage src={currentChat.avatar} />
          <AvatarFallback>{currentChat.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-gray-800">{currentChat.name}</h2>
          <p className="text-sm text-green-600">{currentChat.status}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImageUploader(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Camera className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-12"
            />
            <Button
              onClick={handleSendMessage}
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600"
              disabled={!newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Uploader Modal */}
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
