
-- Create a table to track read messages
CREATE TABLE public.message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL,
  chat_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Add Row Level Security (RLS)
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view their own read status
CREATE POLICY "Users can view their own read status" 
  ON public.message_reads 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to mark messages as read
CREATE POLICY "Users can mark messages as read" 
  ON public.message_reads 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to update their read status
CREATE POLICY "Users can update their read status" 
  ON public.message_reads 
  FOR UPDATE 
  USING (auth.uid() = user_id);
