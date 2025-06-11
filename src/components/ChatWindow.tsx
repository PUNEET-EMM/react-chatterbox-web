
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MessageBubble from './MessageBubble';
import ImageUploader from './ImageUploader';

interface ChatWindowProps {
  chatId: string;
}

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

interface ChatInfo {
  id: string;
  name?: string;
  is_group: boolean;
  otherParticipant?: {
    display_name: string;
    avatar_url?: string;
    status: string;
  };
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatId && user) {
      fetchChatInfo();
      fetchMessages();
      subscribeToMessages();
    }

    return () => {
      // Cleanup subscription
      supabase.removeAllChannels();
    };
  }, [chatId, user]);

  const fetchChatInfo = async () => {
    const { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (chat) {
      let chatData: ChatInfo = {
        id: chat.id,
        name: chat.name,
        is_group: chat.is_group
      };

      if (!chat.is_group) {
        // Get other participant for one-on-one chat
        const { data: otherParticipantData } = await supabase
          .from('chat_participants')
          .select(`
            profiles (
              display_name,
              avatar_url,
              status
            )
          `)
          .eq('chat_id', chatId)
          .neq('user_id', user?.id)
          .single();

        if (otherParticipantData?.profiles) {
          chatData.otherParticipant = otherParticipantData.profiles;
        }
      }

      setChatInfo(chatData);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              profiles (
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages(prev => [...prev, newMessage as Message]);
          }
        }
      )
      .subscribe();

    return channel;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: newMessage,
        message_type: 'text'
      });

    if (!error) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (imageUrl: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: 'Image',
        message_type: 'image',
        media_url: imageUrl
      });

    if (!error) {
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
      {/* Chat Header */}
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

      {/* Messages */}
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
