import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Search, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  onShowProfile: () => void;
}

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  status: string;
}

interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  participant: Profile;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
  unreadCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedChat, onSelectChat, onShowProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCurrentUserProfile();
      fetchAllUsers();
      fetchChats();
    }
  }, [user]);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setCurrentUserProfile(data);
    }
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id);
    
    if (data) {
      setAllUsers(data);
    }
  };

  const fetchChats = async () => {
    if (!user) return;

    const { data: chatParticipants } = await supabase
      .from('chat_participants')
      .select(`
        chat_id,
        chats!inner (
          id,
          name,
          is_group,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (chatParticipants) {
      const chatList: Chat[] = [];
      
      for (const participant of chatParticipants) {
        const chat = participant.chats;
        
        if (!chat.is_group) {
          // For one-on-one chats, get the other participant
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select(`
              profiles!inner (
                id,
                display_name,
                avatar_url,
                status
              )
            `)
            .eq('chat_id', chat.id)
            .neq('user_id', user.id)
            .single();

          if (otherParticipant) {
            chatList.push({
              id: chat.id,
              name: chat.name,
              is_group: chat.is_group,
              participant: otherParticipant.profiles,
              unreadCount: 0 // TODO: Implement unread count
            });
          }
        }
      }
      
      setChats(chatList);
    }
  };

  const createChat = async (otherUserId: string) => {
    if (!user) return;

    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('chat_participants')
      .select(`
        chat_id,
        chats!inner (
          id,
          is_group
        )
      `)
      .eq('user_id', user.id);

    if (existingChat) {
      for (const participant of existingChat) {
        if (!participant.chats.is_group) {
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', participant.chat_id)
            .neq('user_id', user.id)
            .single();

          if (otherParticipant?.user_id === otherUserId) {
            onSelectChat(participant.chat_id);
            return;
          }
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
      fetchChats(); // Refresh chat list
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const filteredUsers = allUsers.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChats = chats.filter(chat =>
    chat.participant.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="bg-gray-100 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="cursor-pointer" onClick={onShowProfile}>
              <AvatarImage src={currentUserProfile?.avatar_url || ''} />
              <AvatarFallback>
                {currentUserProfile?.display_name?.split(' ').map(n => n[0]).join('') || 'ME'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-gray-800">
                {currentUserProfile?.display_name || 'My Profile'}
              </h2>
              <p className="text-sm text-gray-600">{currentUserProfile?.status || 'Available'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-800"
          >
            Logout
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search chats and users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* Existing Chats */}
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedChat === chat.id ? 'bg-green-50 border-r-4 border-r-green-500' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={chat.participant.avatar_url || ''} />
                <AvatarFallback>
                  {chat.participant.display_name?.split(' ').map(n => n[0]).join('') || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-800 truncate">
                    {chat.participant.display_name}
                  </h3>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage?.content || 'Start a conversation'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {chat.participant.status}
                    </Badge>
                    {chat.unreadCount > 0 && (
                      <Badge className="bg-green-500 text-white text-xs">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Available Users to Chat With */}
        {searchTerm && (
          <>
            <div className="p-3 bg-gray-50 border-b">
              <h4 className="text-sm font-medium text-gray-700">Start new chat</h4>
            </div>
            {filteredUsers.map((profile) => (
              <div
                key={profile.id}
                onClick={() => createChat(profile.id)}
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback>
                      {profile.display_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {profile.display_name}
                    </h3>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {profile.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {filteredChats.length === 0 && !searchTerm && (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No chats yet</p>
            <p className="text-sm text-gray-400 mt-1">Search for users to start chatting</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
