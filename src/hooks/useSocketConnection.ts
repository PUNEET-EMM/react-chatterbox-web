
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
    if (!userId) {
      console.log('No userId provided, skipping socket connection');
      return;
    }

    console.log('Setting up socket connection for user:', userId);

    // Connect to WebSocket
    socketService.connect(userId);
    
    // Check connection status immediately and periodically
    const checkConnection = () => {
      const connected = socketService.isConnected();
      setIsSocketConnected(connected);
      console.log('Socket connection status:', connected);
    };
    
    // Initial check
    checkConnection();
    
    // Periodic checks
    const connectionInterval = setInterval(checkConnection, 2000);

    const handleConnected = () => {
      console.log('WebSocket connection confirmed');
      setIsSocketConnected(true);
    };

    const handleDisconnected = () => {
      console.log('WebSocket disconnected');
      setIsSocketConnected(false);
    };

    // Set up event listeners
    socketService.on('incoming-call', handlers.onIncomingCall);
    socketService.on('call-accepted', handlers.onCallAccepted);
    socketService.on('call-rejected', handlers.onCallRejected);
    socketService.on('call-ended', handlers.onCallEnded);
    socketService.on('ice-candidate', handlers.onIceCandidate);
    socketService.on('connected', handleConnected);
    socketService.on('disconnected', handleDisconnected);

    return () => {
      clearInterval(connectionInterval);
      socketService.off('incoming-call', handlers.onIncomingCall);
      socketService.off('call-accepted', handlers.onCallAccepted);
      socketService.off('call-rejected', handlers.onCallRejected);
      socketService.off('call-ended', handlers.onCallEnded);
      socketService.off('ice-candidate', handlers.onIceCandidate);
      socketService.off('connected', handleConnected);
      socketService.off('disconnected', handleDisconnected);
      socketService.disconnect();
    };
  }, [userId, handlers]);

  const emitSocketEvent = useCallback((event: string, data: any) => {
    if (socketService.isConnected()) {
      socketService.emit(event, data);
      console.log('Socket event emitted:', event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, []);

  return {
    isSocketConnected,
    emitSocketEvent
  };
};
