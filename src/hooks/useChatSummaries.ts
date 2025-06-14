
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatSummary {
  id: string;
  name?: string;
  is_group: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: string;
  unreadCount: number;
  otherParticipant?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    status: string;
  };
}

export const useChatSummaries = (userId?: string) => {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);

  useEffect(() => {
    if (userId) {
      fetchChatSummaries();
      const subscription = subscribeToMessages();
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [userId]);

  const fetchChatSummaries = async () => {
    if (!userId) return;

    // Get user's chats
    const { data: chatParticipants } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId);

    if (!chatParticipants) return;

    const chatIds = chatParticipants.map(cp => cp.chat_id);
    
    const { data: chatsData } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (!chatsData) return;

    const summaries = await Promise.all(
      chatsData.map(async (chat) => {
        let chatSummary: ChatSummary = {
          id: chat.id,
          name: chat.name,
          is_group: chat.is_group,
          unreadCount: 0
        };

        // Get last message
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, message_type')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMessageData) {
          chatSummary.lastMessage = lastMessageData.message_type === 'text' 
            ? lastMessageData.content 
            : lastMessageData.message_type === 'image' 
              ? '📷 Image' 
              : '🎵 Audio';
          chatSummary.lastMessageTime = lastMessageData.created_at;
          chatSummary.lastMessageSenderId = lastMessageData.sender_id;

          // Count unread messages - messages not in message_reads table and not sent by current user
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .neq('sender_id', userId)
            .not('id', 'in', `(
              SELECT message_id 
              FROM message_reads 
              WHERE user_id = '${userId}' AND chat_id = '${chat.id}'
            )`);

          chatSummary.unreadCount = count || 0;
        }

        // Get other participant for 1-on-1 chats
        if (!chat.is_group) {
          const { data: otherParticipantData } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id)
            .neq('user_id', userId)
            .maybeSingle();

          if (otherParticipantData) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherParticipantData.user_id)
              .maybeSingle();

            if (profileData) {
              chatSummary.otherParticipant = {
                id: profileData.id,
                display_name: profileData.display_name,
                avatar_url: profileData.avatar_url,
                status: profileData.status
              };
            }
          }
        }

        return chatSummary;
      })
    );

    setChatSummaries(summaries);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-summaries-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // Only increment unread count for new messages from other users
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== userId) {
            setChatSummaries(prev => 
              prev.map(chat => 
                chat.id === payload.new.chat_id 
                  ? { 
                      ...chat, 
                      unreadCount: chat.unreadCount + 1,
                      lastMessage: payload.new.message_type === 'text' 
                        ? payload.new.content 
                        : payload.new.message_type === 'image' 
                          ? '📷 Image' 
                          : '🎵 Audio',
                      lastMessageTime: payload.new.created_at,
                      lastMessageSenderId: payload.new.sender_id
                    }
                  : chat
              )
            );
          }
        }
      )
      .subscribe();

    return channel;
  };

  const markChatAsRead = async (chatId: string) => {
    if (!userId) return;

    // Get all unread messages in this chat
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .neq('sender_id', userId)
      .not('id', 'in', `(
        SELECT message_id 
        FROM message_reads 
        WHERE user_id = '${userId}' AND chat_id = '${chatId}'
      )`);

    if (unreadMessages && unreadMessages.length > 0) {
      // Mark all unread messages as read
      const readRecords = unreadMessages.map(message => ({
        user_id: userId,
        message_id: message.id,
        chat_id: chatId
      }));

      await supabase
        .from('message_reads')
        .insert(readRecords);
    }

    // Immediately clear the unread count for the selected chat
    setChatSummaries(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, unreadCount: 0 }
          : chat
      )
    );
  };

  return { chatSummaries, fetchChatSummaries, markChatAsRead };
};
