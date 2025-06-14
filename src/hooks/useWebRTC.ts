
import { useRef, useCallback } from 'react';
import { WebRTCService } from '@/services/webrtc';

export const useWebRTC = () => {
  const webrtcRef = useRef<WebRTCService | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const initializeWebRTC = useCallback((onIceCandidate: (candidate: RTCIceCandidate) => void) => {
    webrtcRef.current = new WebRTCService();
    
    // Set up remote stream handler
    webrtcRef.current.onRemoteStream((stream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    });

    // Set up ICE candidate handler
    webrtcRef.current.onIceCandidate = onIceCandidate;
  }, []);

  const startCall = useCallback(async () => {
    if (!webrtcRef.current) throw new Error('WebRTC not initialized');
    return await webrtcRef.current.startCall();
  }, []);

  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!webrtcRef.current) throw new Error('WebRTC not initialized');
    return await webrtcRef.current.answerCall(offer);
  }, []);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!webrtcRef.current) throw new Error('WebRTC not initialized');
    await webrtcRef.current.handleAnswer(answer);
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!webrtcRef.current) throw new Error('WebRTC not initialized');
    await webrtcRef.current.addIceCandidate(candidate);
  }, []);

  const endCall = useCallback(() => {
    if (webrtcRef.current) {
      webrtcRef.current.endCall();
      webrtcRef.current = null;
    }
  }, []);

  return {
    initializeWebRTC,
    startCall,
    answerCall,
    handleAnswer,
    addIceCandidate,
    endCall,
    remoteAudioRef
  };
};
