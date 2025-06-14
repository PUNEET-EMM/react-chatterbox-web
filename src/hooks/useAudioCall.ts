import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WebRTCService } from '@/services/webrtc';
import { socketService } from '@/services/socket';

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

export const useAudioCall = () => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const webrtcRef = useRef<WebRTCService | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (user) {
      // Connect to WebSocket
      socketService.connect(user.id);
      
      // Check connection status periodically
      const checkConnection = () => {
        setIsSocketConnected(socketService.isConnected());
      };
      
      const connectionInterval = setInterval(checkConnection, 2000);
      
      // Listen for incoming calls
      const handleIncomingCall = (call: Call, offer: RTCSessionDescriptionInit) => {
        console.log('Incoming call received:', call);
        setIncomingCall(call);
        setPendingOffer(offer);
      };

      const handleCallAccepted = async (data: { callId: string, answer: RTCSessionDescriptionInit }) => {
        console.log('Call accepted:', data);
        if (webrtcRef.current) {
          try {
            await webrtcRef.current.handleAnswer(data.answer);
            setIsCallActive(true);
            setIsConnecting(false);
          } catch (error) {
            console.error('Error handling call answer:', error);
            setIsConnecting(false);
          }
        }
      };

      const handleCallRejected = () => {
        console.log('Call rejected');
        setCurrentCall(null);
        setIsConnecting(false);
        if (webrtcRef.current) {
          webrtcRef.current.endCall();
        }
      };

      const handleCallEnded = () => {
        console.log('Call ended by other party');
        endCall();
      };

      const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
        console.log('Received ICE candidate:', candidate);
        if (webrtcRef.current) {
          try {
            await webrtcRef.current.addIceCandidate(candidate);
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      };

      const handleConnected = () => {
        console.log('WebSocket connection confirmed');
        setIsSocketConnected(true);
      };

      socketService.on('incoming-call', handleIncomingCall);
      socketService.on('call-accepted', handleCallAccepted);
      socketService.on('call-rejected', handleCallRejected);
      socketService.on('call-ended', handleCallEnded);
      socketService.on('ice-candidate', handleIceCandidate);
      socketService.on('connected', handleConnected);

      return () => {
        clearInterval(connectionInterval);
        socketService.off('incoming-call', handleIncomingCall);
        socketService.off('call-accepted', handleCallAccepted);
        socketService.off('call-rejected', handleCallRejected);
        socketService.off('call-ended', handleCallEnded);
        socketService.off('ice-candidate', handleIceCandidate);
        socketService.off('connected', handleConnected);
        socketService.disconnect();
      };
    }
  }, [user]);

  const startCall = useCallback(async (receiverId: string) => {
    if (!user || !socketService.isConnected()) {
      console.error('Cannot start call: user not authenticated or socket not connected');
      return null;
    }

    try {
      setIsConnecting(true);
      
      // Create call record in database
      const { data: callData, error } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          receiver_id: receiverId,
          status: 'pending' as const
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCall(callData as Call);

      // Initialize WebRTC
      webrtcRef.current = new WebRTCService();
      
      // Set up remote stream handler
      webrtcRef.current.onRemoteStream((stream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
        }
      });

      // Set up ICE candidate handler
      webrtcRef.current.onIceCandidate = (candidate) => {
        socketService.emit('ice-candidate', {
          callId: callData.id,
          candidate,
          targetUserId: receiverId
        });
      };

      // Create offer
      const offer = await webrtcRef.current.startCall();

      // Send call invitation via WebSocket
      socketService.emit('call-user', {
        callId: callData.id,
        callerId: user.id,
        receiverId,
        offer
      });

      return callData as Call;
    } catch (error) {
      console.error('Error starting call:', error);
      setIsConnecting(false);
      return null;
    }
  }, [user]);

  const answerCall = useCallback(async (call: Call) => {
    if (!user || !pendingOffer) return;

    try {
      setIncomingCall(null);
      setCurrentCall(call);
      setIsConnecting(true);

      // Initialize WebRTC
      webrtcRef.current = new WebRTCService();
      
      // Set up remote stream handler
      webrtcRef.current.onRemoteStream((stream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
        }
      });

      // Set up ICE candidate handler
      webrtcRef.current.onIceCandidate = (candidate) => {
        socketService.emit('ice-candidate', {
          callId: call.id,
          candidate,
          targetUserId: call.caller_id
        });
      };

      // Answer the call with the pending offer
      const answer = await webrtcRef.current.answerCall(pendingOffer);

      // Update call status in database
      await supabase
        .from('calls')
        .update({ status: 'accepted' as const, started_at: new Date().toISOString() })
        .eq('id', call.id);

      // Send answer via WebSocket
      socketService.emit('answer-call', {
        callId: call.id,
        answer,
        targetUserId: call.caller_id
      });

      setIsCallActive(true);
      setIsConnecting(false);
      setPendingOffer(null);
    } catch (error) {
      console.error('Error answering call:', error);
      setIsConnecting(false);
      setPendingOffer(null);
    }
  }, [user, pendingOffer]);

  const rejectCall = useCallback(async (call: Call) => {
    setIncomingCall(null);
    setPendingOffer(null);

    // Update call status in database
    await supabase
      .from('calls')
      .update({ status: 'rejected' as const, ended_at: new Date().toISOString() })
      .eq('id', call.id);

    // Notify caller via WebSocket
    socketService.emit('reject-call', {
      callId: call.id,
      targetUserId: call.caller_id
    });
  }, []);

  const endCall = useCallback(async () => {
    if (currentCall) {
      // Update call status in database
      await supabase
        .from('calls')
        .update({ status: 'ended' as const, ended_at: new Date().toISOString() })
        .eq('id', currentCall.id);

      // Notify other participant via WebSocket
      const targetUserId = currentCall.caller_id === user?.id 
        ? currentCall.receiver_id 
        : currentCall.caller_id;

      socketService.emit('end-call', {
        callId: currentCall.id,
        targetUserId
      });
    }

    // Clean up WebRTC
    if (webrtcRef.current) {
      webrtcRef.current.endCall();
      webrtcRef.current = null;
    }

    // Reset state
    setCurrentCall(null);
    setIsCallActive(false);
    setIsConnecting(false);
    setPendingOffer(null);
  }, [currentCall, user]);

  return {
    currentCall,
    isCallActive,
    incomingCall,
    isConnecting,
    isSocketConnected,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    remoteAudioRef
  };
};
