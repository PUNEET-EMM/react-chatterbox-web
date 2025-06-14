
import { supabase } from '@/integrations/supabase/client';
import { Call } from '@/types/call';

export const createCallRecord = async (callerId: string, receiverId: string): Promise<Call> => {
  const { data: callData, error } = await supabase
    .from('calls')
    .insert({
      caller_id: callerId,
      receiver_id: receiverId,
      status: 'pending' as const
    })
    .select()
    .single();

  if (error) throw error;
  return callData as Call;
};

export const updateCallStatus = async (
  callId: string, 
  status: Call['status'], 
  timestamp?: string
) => {
  const updateData: any = { status };
  
  if (status === 'accepted') {
    updateData.started_at = timestamp || new Date().toISOString();
  } else if (status === 'rejected' || status === 'ended') {
    updateData.ended_at = timestamp || new Date().toISOString();
  }

  const { error } = await supabase
    .from('calls')
    .update(updateData)
    .eq('id', callId);

  if (error) throw error;
};

export const getTargetUserId = (call: Call, currentUserId: string): string => {
  return call.caller_id === currentUserId ? call.receiver_id : call.caller_id;
};
