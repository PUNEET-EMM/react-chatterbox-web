
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  chat_id?: string;
  offer?: any;
  answer?: any;
  ice_candidates?: any[];
  call_type: string;
  status: 'calling' | 'accepted' | 'rejected' | 'ended';
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export const useAudioCall = () => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  };

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play();
      }
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && currentCall) {
        console.log('Adding ICE candidate');
        const { data: existingCall } = await supabase
          .from('calls')
          .select('ice_candidates')
          .eq('id', currentCall.id)
          .single();

        if (existingCall) {
          const candidates = existingCall.ice_candidates || [];
          candidates.push(event.candidate);
          
          await supabase
            .from('calls')
            .update({ ice_candidates: candidates })
            .eq('id', currentCall.id);
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentCall]);

  // Get user media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  };

  // Start call
  const startCall = useCallback(async (calleeId: string, chatId?: string) => {
    try {
      console.log('Starting call to:', calleeId);
      
      // Get user media
      const stream = await getUserMedia();
      
      // Initialize peer connection
      const pc = initializePeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Insert call into database
      const { data: newCall, error } = await supabase
        .from('calls')
        .insert({
          caller_id: user?.id,
          callee_id: calleeId,
          chat_id: chatId,
          offer: offer,
          call_type: 'audio',
          status: 'calling'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCall(newCall);
      setIsInCall(true);
      
      // Start call timer
      const startTime = Date.now();
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      console.log('Call started:', newCall);
      return newCall;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }, [user, initializePeerConnection]);

  // Accept call
  const acceptCall = useCallback(async (call: Call) => {
    try {
      console.log('Accepting call:', call.id);
      
      // Get user media
      const stream = await getUserMedia();
      
      // Initialize peer connection
      const pc = initializePeerConnection();
      
      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description (caller's offer)
      await pc.setRemoteDescription(call.offer);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Update call with answer
      const { error } = await supabase
        .from('calls')
        .update({
          answer: answer,
          status: 'accepted'
        })
        .eq('id', call.id);

      if (error) throw error;

      setCurrentCall(call);
      setIsInCall(true);
      setIncomingCall(null);
      
      // Start call timer
      const startTime = Date.now();
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      console.log('Call accepted');
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }, [initializePeerConnection]);

  // Reject call
  const rejectCall = useCallback(async (call: Call) => {
    try {
      console.log('Rejecting call:', call.id);
      
      await supabase
        .from('calls')
        .update({ status: 'rejected' })
        .eq('id', call.id);

      setIncomingCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, []);

  // End call
  const endCall = useCallback(async () => {
    try {
      console.log('Ending call');
      
      if (currentCall) {
        await supabase
          .from('calls')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', currentCall.id);
      }

      // Cleanup
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }

      setCurrentCall(null);
      setIsInCall(false);
      setCallDuration(0);
      setIsMuted(false);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [currentCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Listen for realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New incoming call:', payload.new);
          setIncomingCall(payload.new as Call);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `caller_id=eq.${user.id}`
        },
        async (payload) => {
          const updatedCall = payload.new as Call;
          console.log('Call updated:', updatedCall);
          
          if (updatedCall.status === 'accepted' && updatedCall.answer && peerConnectionRef.current) {
            // Set remote description (callee's answer)
            await peerConnectionRef.current.setRemoteDescription(updatedCall.answer);
          } else if (updatedCall.status === 'rejected') {
            endCall();
          } else if (updatedCall.status === 'ended') {
            endCall();
          }
          
          setCurrentCall(updatedCall);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${user.id}`
        },
        (payload) => {
          const updatedCall = payload.new as Call;
          console.log('Call updated (as callee):', updatedCall);
          
          if (updatedCall.status === 'ended') {
            endCall();
          }
          
          setCurrentCall(updatedCall);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return {
    currentCall,
    isInCall,
    isMuted,
    callDuration,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    remoteAudioRef
  };
};
