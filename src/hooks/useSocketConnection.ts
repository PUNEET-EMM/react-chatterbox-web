
import { useState, useEffect, useCallback } from 'react';
import { socketService } from '@/services/socket';
import { Call } from '@/types/call';

interface SocketEventHandlers {
  onIncomingCall: (call: Call, offer: RTCSessionDescriptionInit) => void;
  onCallAccepted: (data: { callId: string, answer: RTCSessionDescriptionInit }) => void;
  onCallRejected: () => void;
  onCallEnded: () => void;
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
}

export const useSocketConnection = (userId: string | undefined, handlers: SocketEventHandlers) => {
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Connect to WebSocket
    socketService.connect(userId);
    
    // Check connection status periodically
    const checkConnection = () => {
      setIsSocketConnected(socketService.isConnected());
    };
    
    const connectionInterval = setInterval(checkConnection, 2000);

    const handleConnected = () => {
      console.log('WebSocket connection confirmed');
      setIsSocketConnected(true);
    };

    // Set up event listeners
    socketService.on('incoming-call', handlers.onIncomingCall);
    socketService.on('call-accepted', handlers.onCallAccepted);
    socketService.on('call-rejected', handlers.onCallRejected);
    socketService.on('call-ended', handlers.onCallEnded);
    socketService.on('ice-candidate', handlers.onIceCandidate);
    socketService.on('connected', handleConnected);

    return () => {
      clearInterval(connectionInterval);
      socketService.off('incoming-call', handlers.onIncomingCall);
      socketService.off('call-accepted', handlers.onCallAccepted);
      socketService.off('call-rejected', handlers.onCallRejected);
      socketService.off('call-ended', handlers.onCallEnded);
      socketService.off('ice-candidate', handlers.onIceCandidate);
      socketService.off('connected', handleConnected);
      socketService.disconnect();
    };
  }, [userId, handlers]);

  const emitSocketEvent = useCallback((event: string, data: any) => {
    if (socketService.isConnected()) {
      socketService.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, []);

  return {
    isSocketConnected,
    emitSocketEvent
  };
};
