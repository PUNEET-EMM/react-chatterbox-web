
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export const useMessages = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      const subscription = subscribeToMessages();
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [chatId]);

  const fetchMessages = async () => {
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      // Fetch profile data separately for each message
      const messagesWithProfiles = await Promise.all(
        messagesData.map(async (message) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', message.sender_id)
            .single();

          return {
            ...message,
            profiles: profile || { display_name: 'Unknown User', avatar_url: null }
          };
        })
      );

      setMessages(messagesWithProfiles as Message[]);
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
          // Fetch the profile data for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            profiles: profile || { display_name: 'Unknown User', avatar_url: null }
          } as Message;

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async (content: string, userId: string, messageType: 'text' | 'image' | 'audio' = 'text', mediaUrl?: string) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: userId,
        content,
        message_type: messageType,
        media_url: mediaUrl
      });

    return !error;
  };

  return { messages, sendMessage };
};
