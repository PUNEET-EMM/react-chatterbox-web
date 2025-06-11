
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
          .neq('user_id', userId)
          .single();

        if (otherParticipantData?.profiles) {
          chatData.otherParticipant = otherParticipantData.profiles;
        }
      }

      setChatInfo(chatData);
    }
  };

  return { chatInfo, refetchChatInfo: fetchChatInfo };
};
