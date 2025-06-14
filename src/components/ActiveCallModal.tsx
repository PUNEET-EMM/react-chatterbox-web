
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneOff, Mic, MicOff } from 'lucide-react';

interface ActiveCallModalProps {
  isOpen: boolean;
  participantName: string;
  participantAvatar?: string;
  onEndCall: () => void;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
}

const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  isOpen,
  participantName,
  participantAvatar,
  onEndCall,
  remoteAudioRef
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      setCallDuration(0);
    };
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, you'd mute/unmute the local audio track
  };

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay />
      <Dialog open={isOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center space-y-6 py-6">
            <Avatar className="h-32 w-32">
              <AvatarImage src={participantAvatar} alt={participantName} />
              <AvatarFallback className="text-3xl">
                {participantName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold">{participantName}</h3>
              <p className="text-gray-500">{formatDuration(callDuration)}</p>
            </div>
            
            <div className="flex space-x-4">
              <Button
                onClick={toggleMute}
                size="lg"
                variant={isMuted ? "destructive" : "outline"}
                className="rounded-full h-14 w-14"
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <Button
                onClick={onEndCall}
                size="lg"
                variant="destructive"
                className="rounded-full h-14 w-14"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActiveCallModal;
