
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
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const initializePeerConnection = useCallback(() => {
    console.log('Initializing peer connection');
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = async (event) => {
      console.log('ICE candidate generated:', event.candidate);
      
      if (event.candidate) {
        try {
          // Get current candidates
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
            
            console.log('ICE candidate saved to database');
          }
        } catch (error) {
          console.error('Error saving ICE candidate:', error);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track received:', event);
      if (event.streams && event.streams[0]) {
        onRemoteStream?.(event.streams[0]);
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

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', pc.iceConnectionState);
    };

    peerConnection.current = pc;
    return pc;
  }, [callId, onRemoteStream, onCallEnd]);

  const getLocalMedia = useCallback(async (video: boolean = false) => {
    console.log('Getting local media, video:', video);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video
      });
      
      console.log('Local media obtained:', stream.getTracks());
      localStream.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  const createOffer = useCallback(async (video: boolean = false) => {
    console.log('Creating offer, video:', video);
    
    const pc = initializePeerConnection();
    const stream = await getLocalMedia(video);
    
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track);
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    console.log('Offer created and set as local description:', offer);

    const { error } = await supabase
      .from('calls')
      .update({ 
        offer: JSON.parse(JSON.stringify(offer)),
        status: 'ringing'
      })
      .eq('id', callId);

    if (error) {
      console.error('Error saving offer:', error);
      throw error;
    }

    console.log('Offer saved to database');
    return stream;
  }, [callId, initializePeerConnection, getLocalMedia]);

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit, video: boolean = false) => {
    console.log('Creating answer for offer:', offer);
    
    const pc = initializePeerConnection();
    const stream = await getLocalMedia(video);
    
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track);
      pc.addTrack(track, stream);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('Remote description set');
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    console.log('Answer created and set as local description:', answer);

    const { error } = await supabase
      .from('calls')
      .update({ 
        answer: JSON.parse(JSON.stringify(answer)),
        status: 'accepted'
      })
      .eq('id', callId);

    if (error) {
      console.error('Error saving answer:', error);
      throw error;
    }

    console.log('Answer saved to database');
    
    // Process any queued ICE candidates
    for (const candidate of iceCandidatesQueue.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Queued ICE candidate added');
      } catch (error) {
        console.error('Error adding queued ICE candidate:', error);
      }
    }
    iceCandidatesQueue.current = [];

    return stream;
  }, [callId, initializePeerConnection, getLocalMedia]);

  const processAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    console.log('Processing answer:', answer);
    
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description set from answer');
      
      // Process any queued ICE candidates
      for (const candidate of iceCandidatesQueue.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Queued ICE candidate added');
        } catch (error) {
          console.error('Error adding queued ICE candidate:', error);
        }
      }
      iceCandidatesQueue.current = [];
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    console.log('Adding ICE candidate:', candidate);
    
    if (peerConnection.current && peerConnection.current.remoteDescription) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added successfully');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      console.log('Queueing ICE candidate (no remote description yet)');
      iceCandidatesQueue.current.push(candidate);
    }
  }, []);

  const endCall = useCallback(async () => {
    console.log('Ending call');
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        console.log('Stopping track:', track);
        track.stop();
      });
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const { error } = await supabase
      .from('calls')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (error) {
      console.error('Error ending call in database:', error);
    }

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
