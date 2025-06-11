
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Camera } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<boolean>;
  onShowImageUploader: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onShowImageUploader }) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const success = await onSendMessage(newMessage);
    if (success) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white p-4 border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowImageUploader}
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
  );
};

export default MessageInput;
