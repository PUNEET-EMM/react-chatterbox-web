
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

    console.log('Initiating call:', { calleeId, callType, chatId });

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

    console.log('Call created successfully:', call);
    return call;
  }, [user, chatId]);

  const acceptCall = useCallback(async (callId: string) => {
    console.log('Accepting call:', callId);
    
    const { error } = await supabase
      .from('calls')
      .update({ status: 'accepted' })
      .eq('id', callId);

    if (error) {
      console.error('Error accepting call:', error);
    } else {
      setIncomingCall(null);
    }
  }, []);

  const rejectCall = useCallback(async (callId: string) => {
    console.log('Rejecting call:', callId);
    
    const { error } = await supabase
      .from('calls')
      .update({ 
        status: 'rejected',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (error) {
      console.error('Error rejecting call:', error);
    } else {
      setIncomingCall(null);
    }
  }, []);

  const endCall = useCallback(async (callId: string) => {
    console.log('Ending call:', callId);
    
    const { error } = await supabase
      .from('calls')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (error) {
      console.error('Error ending call:', error);
    } else {
      setActiveCall(null);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up calls subscription for user:', user.id);

    const channel = supabase
      .channel('calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `caller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Call change received (as caller):', payload);
          const call = payload.new as Call;
          
          if (payload.eventType === 'UPDATE') {
            if (call.status === 'accepted') {
              setActiveCall(call);
              setIncomingCall(null);
            } else if (call.status === 'ended' || call.status === 'rejected') {
              setActiveCall(null);
              setIncomingCall(null);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Call change received (as callee):', payload);
          const call = payload.new as Call;
          
          if (payload.eventType === 'INSERT' && call.status === 'pending') {
            setIncomingCall(call);
          } else if (payload.eventType === 'UPDATE') {
            if (call.status === 'accepted') {
              setActiveCall(call);
              setIncomingCall(null);
            } else if (call.status === 'ended' || call.status === 'rejected') {
              setActiveCall(null);
              setIncomingCall(null);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Calls channel subscription status:', status);
      });

    return () => {
      console.log('Cleaning up calls subscription');
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
