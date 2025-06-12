
-- Create calls table for WebRTC signaling and call management
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  callee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'accepted', 'rejected', 'ended', 'missed')),
  offer JSONB,
  answer JSONB,
  ice_candidates JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on calls table
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Users can view calls where they are caller or callee
CREATE POLICY "Users can view their calls" 
ON public.calls 
FOR SELECT 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Users can create calls where they are the caller
CREATE POLICY "Users can create calls as caller" 
ON public.calls 
FOR INSERT 
WITH CHECK (auth.uid() = caller_id);

-- Users can update calls where they are caller or callee
CREATE POLICY "Users can update their calls" 
ON public.calls 
FOR UPDATE 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime for calls table
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
