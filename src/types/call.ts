
export interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ended' | 'missed';
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}
