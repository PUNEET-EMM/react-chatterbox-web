
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketConnection } from './useSocketConnection';
import { useWebRTC } from './useWebRTC';
import { createCallRecord, updateCallStatus, getTargetUserId } from '@/utils/callOperations';
import { Call } from '@/types/call';

export const useAudioCall = () => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null);

  const {
    initializeWebRTC,
    startCall: webrtcStartCall,
    answerCall: webrtcAnswerCall,
    handleAnswer,
    addIceCandidate,
    endCall: webrtcEndCall,
    remoteAudioRef
  } = useWebRTC();

  // Socket event handlers
  const handleIncomingCall = useCallback((call: Call, offer: RTCSessionDescriptionInit) => {
    console.log('Incoming call received:', call);
    setIncomingCall(call);
    setPendingOffer(offer);
  }, []);

  const handleCallAccepted = useCallback(async (data: { callId: string, answer: RTCSessionDescriptionInit }) => {
    console.log('Call accepted:', data);
    try {
      await handleAnswer(data.answer);
      setIsCallActive(true);
      setIsConnecting(false);
    } catch (error) {
      console.error('Error handling call answer:', error);
      setIsConnecting(false);
    }
  }, [handleAnswer]);

  const handleCallRejected = useCallback(() => {
    console.log('Call rejected');
    setCurrentCall(null);
    setIsConnecting(false);
    webrtcEndCall();
  }, [webrtcEndCall]);

  const handleCallEnded = useCallback(() => {
    console.log('Call ended by other party');
    endCall();
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    console.log('Received ICE candidate:', candidate);
    try {
      await addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, [addIceCandidate]);

  const { isSocketConnected, emitSocketEvent } = useSocketConnection(user?.id, {
    onIncomingCall: handleIncomingCall,
    onCallAccepted: handleCallAccepted,
    onCallRejected: handleCallRejected,
    onCallEnded: handleCallEnded,
    onIceCandidate: handleIceCandidate
  });

  // Add debugging logs for connection status
  useEffect(() => {
    console.log('Auth status:', { 
      isAuthenticated: !!user, 
      userId: user?.id,
      socketConnected: isSocketConnected 
    });
  }, [user, isSocketConnected]);

  const startCall = useCallback(async (receiverId: string) => {
    console.log('Starting call attempt...', {
      user: !!user,
      userId: user?.id,
      isSocketConnected,
      receiverId
    });

    if (!user) {
      console.error('Cannot start call: user not authenticated');
      return null;
    }

    if (!isSocketConnected) {
      console.error('Cannot start call: socket not connected');
      return null;
    }

    try {
      setIsConnecting(true);
      
      const callData = await createCallRecord(user.id, receiverId);
      setCurrentCall(callData);
      console.log('Call record created:', callData);

      initializeWebRTC((candidate) => {
        emitSocketEvent('ice-candidate', {
          callId: callData.id,
          candidate,
          targetUserId: receiverId
        });
      });

      const offer = await webrtcStartCall();
      console.log('WebRTC offer created:', offer);

      emitSocketEvent('call-user', {
        callId: callData.id,
        callerId: user.id,
        receiverId,
        offer
      });

      console.log('Call invitation sent');
      return callData;
    } catch (error) {
      console.error('Error starting call:', error);
      setIsConnecting(false);
      return null;
    }
  }, [user, isSocketConnected, initializeWebRTC, webrtcStartCall, emitSocketEvent]);

  const answerCall = useCallback(async (call: Call) => {
    if (!user || !pendingOffer) return;

    try {
      setIncomingCall(null);
      setCurrentCall(call);
      setIsConnecting(true);

      initializeWebRTC((candidate) => {
        emitSocketEvent('ice-candidate', {
          callId: call.id,
          candidate,
          targetUserId: call.caller_id
        });
      });

      const answer = await webrtcAnswerCall(pendingOffer);

      await updateCallStatus(call.id, 'accepted');

      emitSocketEvent('answer-call', {
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
  }, [user, pendingOffer, initializeWebRTC, webrtcAnswerCall, emitSocketEvent]);

  const rejectCall = useCallback(async (call: Call) => {
    setIncomingCall(null);
    setPendingOffer(null);

    await updateCallStatus(call.id, 'rejected');

    emitSocketEvent('reject-call', {
      callId: call.id,
      targetUserId: call.caller_id
    });
  }, [emitSocketEvent]);

  const endCall = useCallback(async () => {
    if (currentCall) {
      await updateCallStatus(currentCall.id, 'ended');

      const targetUserId = getTargetUserId(currentCall, user?.id || '');

      emitSocketEvent('end-call', {
        callId: currentCall.id,
        targetUserId
      });
    }

    webrtcEndCall();
    setCurrentCall(null);
    setIsCallActive(false);
    setIsConnecting(false);
    setPendingOffer(null);
  }, [currentCall, user, webrtcEndCall, emitSocketEvent]);

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

// Export the Call type for backward compatibility
export type { Call };
