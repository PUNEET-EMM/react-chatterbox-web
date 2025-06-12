import { useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWebRTCProps {
  callId: string;
  isInitiator: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnd?: () => void;
}

export const useWebRTC = ({ callId, isInitiator, onRemoteStream, onCallEnd }: UseWebRTCProps) => {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const initializePeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const { data: call } = await supabase
          .from('calls')
          .select('ice_candidates')
          .eq('id', callId)
          .single();

        if (call) {
          const candidates = Array.isArray(call.ice_candidates) ? call.ice_candidates : [];
          candidates.push(JSON.parse(JSON.stringify(event.candidate)));

          await supabase
            .from('calls')
            .update({ ice_candidates: candidates })
            .eq('id', callId);
        }
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        onRemoteStream?.(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      } else if (['disconnected', 'failed'].includes(pc.connectionState)) {
        setIsConnected(false);
        onCallEnd?.();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [callId, onRemoteStream, onCallEnd]);

  const getLocalMedia = useCallback(async (video: boolean = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video
      });
      localStream.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  const createOffer = useCallback(async (video: boolean = false) => {
    const pc = initializePeerConnection();
    const stream = await getLocalMedia(video);
    
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await supabase
      .from('calls')
      .update({ 
        offer: JSON.parse(JSON.stringify(offer)),
        status: 'ringing'
      })
      .eq('id', callId);

    return stream;
  }, [callId, initializePeerConnection, getLocalMedia]);

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit, video: boolean = false) => {
    const pc = initializePeerConnection();
    const stream = await getLocalMedia(video);
    
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await supabase
      .from('calls')
      .update({ 
        answer: JSON.parse(JSON.stringify(answer)),
        status: 'accepted'
      })
      .eq('id', callId);

    return stream;
  }, [callId, initializePeerConnection, getLocalMedia]);

  const processAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (peerConnection.current && peerConnection.current.remoteDescription) {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const endCall = useCallback(async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    await supabase
      .from('calls')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);

    setIsConnected(false);
    onCallEnd?.();
  }, [callId, onCallEnd]);

  return {
    createOffer,
    createAnswer,
    processAnswer,
    addIceCandidate,
    endCall,
    isConnected,
    localStream: localStream.current
  };
};
