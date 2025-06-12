
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Call {
  id: string;
  chat_id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  status: 'pending' | 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  offer?: any;
  answer?: any;
  ice_candidates?: any[];
  started_at: string;
  ended_at?: string;
}

export const useCalls = (chatId?: string) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  const initiateCall = useCallback(async (calleeId: string, callType: 'audio' | 'video') => {
    if (!user || !chatId) return null;

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        chat_id: chatId,
        caller_id: user.id,
        callee_id: calleeId,
        call_type: callType,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating call:', error);
      return null;
    }

    return call;
  }, [user, chatId]);

  const acceptCall = useCallback(async (callId: string) => {
    await supabase
      .from('calls')
      .update({ status: 'accepted' })
      .eq('id', callId);
    
    setIncomingCall(null);
  }, []);

  const rejectCall = useCallback(async (callId: string) => {
    await supabase
      .from('calls')
      .update({ 
        status: 'rejected',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);
    
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(async (callId: string) => {
    await supabase
      .from('calls')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);
    
    setActiveCall(null);
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `caller_id=eq.${user.id},callee_id=eq.${user.id}`
        },
        (payload) => {
          const call = payload.new as Call;
          
          if (payload.eventType === 'INSERT' && call.callee_id === user.id) {
            setIncomingCall(call);
          } else if (payload.eventType === 'UPDATE') {
            if (call.status === 'accepted' && (call.caller_id === user.id || call.callee_id === user.id)) {
              setActiveCall(call);
              setIncomingCall(null);
            } else if (call.status === 'ended' || call.status === 'rejected') {
              setActiveCall(null);
              setIncomingCall(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    incomingCall,
    activeCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall
  };
};
