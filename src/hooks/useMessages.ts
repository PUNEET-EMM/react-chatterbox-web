
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

export const useMessages = (chatId: string, userId?: string) => {
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

  // Mark messages as read when viewing the chat
  useEffect(() => {
    if (chatId && userId && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [chatId, userId, messages]);

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

  const markMessagesAsRead = async () => {
    if (!userId) return;

    // Get messages from other users that haven't been marked as read
    const otherUsersMessages = messages.filter(msg => msg.sender_id !== userId);
    
    if (otherUsersMessages.length === 0) return;

    // Check which messages are already marked as read
    const { data: existingReads } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', userId)
      .eq('chat_id', chatId)
      .in('message_id', otherUsersMessages.map(msg => msg.id));

    const alreadyReadMessageIds = existingReads?.map(read => read.message_id) || [];
    
    // Filter out messages that are already marked as read
    const unreadMessages = otherUsersMessages.filter(
      msg => !alreadyReadMessageIds.includes(msg.id)
    );

    if (unreadMessages.length > 0) {
      // Mark new messages as read
      const readRecords = unreadMessages.map(message => ({
        user_id: userId,
        message_id: message.id,
        chat_id: chatId
      }));

      await supabase
        .from('message_reads')
        .insert(readRecords);
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

          // If the new message is from another user, mark it as read immediately since user is viewing the chat
          if (userId && payload.new.sender_id !== userId) {
            await supabase
              .from('message_reads')
              .insert({
                user_id: userId,
                message_id: payload.new.id,
                chat_id: chatId
              });
          }
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

    // Update chat's updated_at timestamp
    if (!error) {
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);
    }

    return !error;
  };

  return { messages, sendMessage };
};
