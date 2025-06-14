
import { useRef, useCallback, useState } from 'react';

interface UseSimpleWebRTCProps {
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnd?: () => void;
}

export const useSimpleWebRTC = ({ onRemoteStream, onCallEnd }: UseSimpleWebRTCProps) => {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializePeerConnection = useCallback(() => {
    console.log('Initializing simple peer connection');
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated:', event.candidate);
        // In a real implementation, you would send this to the other peer
        // For now, we'll simulate a direct connection
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track received:', event);
      if (event.streams && event.streams[0]) {
        onRemoteStream?.(event.streams[0]);
        setIsConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setIsConnected(false);
        if (pc.connectionState === 'failed') {
          onCallEnd?.();
        }
      }
    };

    peerConnection.current = pc;
    setIsInitialized(true);
    return pc;
  }, [onRemoteStream, onCallEnd]);

  const getLocalMedia = useCallback(async (video: boolean = false) => {
    console.log('Getting local media, video:', video);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: video ? {
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : false
      });
      
      console.log('Local media obtained:', stream.getTracks());
      localStream.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  const startCall = useCallback(async (video: boolean = false) => {
    console.log('Starting call, video:', video);
    
    const pc = initializePeerConnection();
    const stream = await getLocalMedia(video);
    
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track);
      pc.addTrack(track, stream);
    });

    // Simulate successful connection for demo purposes
    setTimeout(() => {
      setIsConnected(true);
    }, 2000);

    return stream;
  }, [initializePeerConnection, getLocalMedia]);

  const endCall = useCallback(() => {
    console.log('Ending simple call');
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        console.log('Stopping track:', track);
        track.stop();
      });
      localStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setIsConnected(false);
    setIsInitialized(false);
    onCallEnd?.();
  }, [onCallEnd]);

  return {
    startCall,
    endCall,
    isConnected,
    isInitialized,
    localStream: localStream.current
  };
};
