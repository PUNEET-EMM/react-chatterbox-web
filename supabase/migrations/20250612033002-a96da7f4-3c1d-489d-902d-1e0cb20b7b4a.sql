
-- Create storage bucket for chat audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-audios', 'chat-audios', true);

-- Storage policies for chat audio
CREATE POLICY "Chat audio files are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-audios');

CREATE POLICY "Authenticated users can upload chat audio" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat-audios' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own chat audio" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'chat-audios' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own chat audio" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'chat-audios' AND auth.role() = 'authenticated');
