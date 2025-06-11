
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export const useChatInfo = (chatId: string, userId?: string) => {
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);

  useEffect(() => {
    if (chatId && userId) {
      fetchChatInfo();
    }
  }, [chatId, userId]);

  const fetchChatInfo = async () => {
    if (!userId) return;

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
        const { data: participantData } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chatId)
          .neq('user_id', userId)
          .single();

        if (participantData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, status')
            .eq('id', participantData.user_id)
            .single();

          if (profileData) {
            chatData.otherParticipant = profileData;
          }
        }
      }

      setChatInfo(chatData);
    }
  };

  return { chatInfo, refetchChatInfo: fetchChatInfo };
};
