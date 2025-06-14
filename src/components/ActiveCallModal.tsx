
import React, { useEffect, useState } from 'react';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAudioCall } from '@/hooks/useAudioCall';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ParticipantInfo {
  display_name?: string;
  avatar_url?: string;
}

const ActiveCallModal: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentCall, 
    isInCall, 
    isMuted, 
    callDuration, 
    endCall, 
    toggleMute,
    remoteAudioRef 
  } = useAudioCall();
  const [otherParticipant, setOtherParticipant] = useState<ParticipantInfo | null>(null);

  useEffect(() => {
    if (currentCall && user) {
      const otherUserId = currentCall.caller_id === user.id 
        ? currentCall.callee_id 
        : currentCall.caller_id;

      const fetchParticipantInfo = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', otherUserId)
          .single();
        
        setOtherParticipant(data);
      };

      fetchParticipantInfo();
    }
  }, [currentCall, user]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isInCall || !currentCall) return null;

  return (
    <>
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />
      
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 text-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
          <div className="mb-8">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={otherParticipant?.avatar_url} alt={otherParticipant?.display_name} />
              <AvatarFallback className="bg-gray-700 text-white text-lg">
                {otherParticipant?.display_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold mb-2">
              {otherParticipant?.display_name || 'Unknown User'}
            </h2>
            <p className="text-green-400 text-sm">
              {currentCall.status === 'calling' ? 'Calling...' : formatDuration(callDuration)}
            </p>
          </div>

          <div className="flex justify-center space-x-6">
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full h-14 w-14"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={endCall}
              variant="destructive"
              size="lg"
              className="rounded-full h-14 w-14"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>

          {currentCall.status === 'calling' && (
            <p className="text-gray-400 text-xs mt-4">
              Waiting for answer...
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ActiveCallModal;
