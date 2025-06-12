
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';

interface CallWindowProps {
  callId: string;
  isInitiator: boolean;
  callType: 'audio' | 'video';
  callerName: string;
  calleeName: string;
  onEndCall: () => void;
  offer?: any;
}

const CallWindow: React.FC<CallWindowProps> = ({
  callId,
  isInitiator,
  callType,
  callerName,
  calleeName,
  onEndCall,
  offer
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');

  const { createOffer, createAnswer, endCall, isConnected } = useWebRTC({
    callId,
    isInitiator,
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    },
    onCallEnd: onEndCall
  });

  useEffect(() => {
    const initializeCall = async () => {
      try {
        if (isInitiator) {
          const stream = await createOffer(callType === 'video');
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else if (offer) {
          const stream = await createAnswer(offer, callType === 'video');
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (error) {
        console.error('Error initializing call:', error);
        onEndCall();
      }
    };

    initializeCall();
  }, [callId, isInitiator, callType, offer, createOffer, createAnswer, onEndCall]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleEndCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    await endCall();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-full max-h-[600px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isInitiator ? `Calling ${calleeName}` : `Call from ${callerName}`}
          </h2>
          <div className="text-sm text-gray-500">
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        <div className="flex-1 relative">
          {callType === 'video' ? (
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  {isInitiator ? calleeName : callerName}
                </div>
              </div>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  You
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-semibold text-gray-600">
                    {(isInitiator ? calleeName : callerName).charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-lg font-medium">
                  {isInitiator ? calleeName : callerName}
                </p>
                <p className="text-sm text-gray-500">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center space-x-4 mt-6">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          
          {callType === 'video' && (
            <Button
              onClick={toggleVideo}
              variant={!isVideoEnabled ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-14 h-14"
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
          )}
          
          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CallWindow;
