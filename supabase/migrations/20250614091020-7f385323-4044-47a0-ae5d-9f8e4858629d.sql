
-- Create calls table for managing audio call sessions
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ended', 'missed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- RLS policies for calls
CREATE POLICY "Users can view their own calls" ON calls
  FOR SELECT USING (
    auth.uid() = caller_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can insert their own calls" ON calls
  FOR INSERT WITH CHECK (
    auth.uid() = caller_id
  );

CREATE POLICY "Users can update their own calls" ON calls
  FOR UPDATE USING (
    auth.uid() = caller_id OR auth.uid() = receiver_id
  );
