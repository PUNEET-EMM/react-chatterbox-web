
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create chats table for chat rooms
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create chat_participants table for managing who's in each chat
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE(chat_id, user_id)
);

-- Create messages table for storing chat messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', TRUE);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Chats policies
CREATE POLICY "Users can view chats they participate in" ON public.chats FOR SELECT 
USING (id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chat participants policies
CREATE POLICY "Users can view participants of their chats" ON public.chat_participants FOR SELECT 
USING (chat_id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()));

CREATE POLICY "Chat creators can add participants" ON public.chat_participants FOR INSERT 
WITH CHECK (chat_id IN (SELECT id FROM public.chats WHERE created_by = auth.uid()));

-- Messages policies
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT 
USING (chat_id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can send messages to their chats" ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND 
  chat_id IN (SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid())
);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for chat media
CREATE POLICY "Chat media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for chats
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Enable realtime for profiles
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
