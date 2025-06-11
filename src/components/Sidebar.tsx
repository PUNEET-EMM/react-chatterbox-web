
import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Settings, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  display_name: string;
  status: string;
  avatar_url?: string;
}

interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  otherParticipant?: Profile;
}

interface SidebarProps {
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  onShowProfile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedChat, onSelectChat, onShowProfile }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;

    const { data: chatParticipants } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    if (chatParticipants) {
      const chatIds = chatParticipants.map(cp => cp.chat_id);
      
      const { data: chatsData } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (chatsData) {
        const chatsWithDetails = await Promise.all(
          chatsData.map(async (chat) => {
            let chatInfo: Chat = {
              id: chat.id,
              name: chat.name,
              is_group: chat.is_group
            };

            if (!chat.is_group) {
              // Get other participant
              const { data: otherParticipantData } = await supabase
                .from('chat_participants')
                .select('user_id')
                .eq('chat_id', chat.id)
                .neq('user_id', user.id)
                .single();

              if (otherParticipantData) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', otherParticipantData.user_id)
                  .single();

                if (profileData) {
                  chatInfo.otherParticipant = profileData;
                }
              }
            }

            return chatInfo;
          })
        );

        setChats(chatsWithDetails);
      }
    }
  };

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id)
      .ilike('display_name', `%${searchTerm}%`)
      .limit(10);

    setSearchResults(data || []);
  };

  const createChatWithUser = async (otherUserId: string) => {
    if (!user) return;

    // Check if chat already exists
    const { data: existingParticipants } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    if (existingParticipants) {
      for (const participant of existingParticipants) {
        const { data: otherParticipant } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', participant.chat_id)
          .eq('user_id', otherUserId)
          .single();

        if (otherParticipant) {
          onSelectChat(participant.chat_id);
          setShowSearch(false);
          setSearchTerm('');
          return;
        }
      }
    }

    // Create new chat
    const { data: newChat } = await supabase
      .from('chats')
      .insert({
        is_group: false,
        created_by: user.id
      })
      .select()
      .single();

    if (newChat) {
      // Add participants
      await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: otherUserId }
        ]);

      onSelectChat(newChat.id);
      setShowSearch(false);
      setSearchTerm('');
      fetchChats();
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowProfile}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="pl-10"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => createChatWithUser(user.id)}
                  >
                    <Avatar className="w-8 h-8 mr-3">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>
                        {user.display_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.display_name}</p>
                      <p className="text-xs text-gray-500">{user.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs">Search for users to start chatting</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {chats.map((chat) => {
              const displayName = chat.is_group ? chat.name : chat.otherParticipant?.display_name || 'Unknown User';
              const avatarUrl = chat.is_group ? '' : chat.otherParticipant?.avatar_url;
              
              return (
                <div
                  key={chat.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat === chat.id ? 'bg-green-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={avatarUrl || ''} />
                      <AvatarFallback>
                        {chat.is_group ? (
                          <Users className="h-6 w-6" />
                        ) : (
                          displayName.split(' ').map(n => n[0]).join('')
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {!chat.is_group && chat.otherParticipant?.status === 'Available' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">
                        {displayName}
                      </p>
                      {chat.lastMessageTime && (
                        <p className="text-xs text-gray-500">
                          {new Date(chat.lastMessageTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </p>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
              <AvatarFallback>
                {user?.user_metadata?.display_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user?.user_metadata?.display_name || user?.email}</p>
              <p className="text-xs text-green-600">Available</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
