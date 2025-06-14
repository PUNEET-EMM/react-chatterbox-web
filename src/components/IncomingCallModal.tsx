
import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAudioCall } from '@/hooks/useAudioCall';
import { supabase } from '@/integrations/supabase/client';

interface CallerInfo {
  display_name?: string;
  avatar_url?: string;
}

const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useAudioCall();
  const [callerInfo, setCallerInfo] = useState<CallerInfo | null>(null);
  const [ringtone] = useState(() => {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCCN+x/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUiCC';
    audio.loop = true;
    return audio;
  });

  useEffect(() => {
    if (incomingCall) {
      // Fetch caller info
      const fetchCallerInfo = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', incomingCall.caller_id)
          .single();
        
        setCallerInfo(data);
      };

      fetchCallerInfo();

      // Play ringtone
      ringtone.play().catch(console.error);

      // Auto-reject after 30 seconds
      const timeout = setTimeout(() => {
        rejectCall(incomingCall);
      }, 30000);

      return () => {
        clearTimeout(timeout);
        ringtone.pause();
        ringtone.currentTime = 0;
      };
    }
  }, [incomingCall, rejectCall, ringtone]);

  const handleAccept = () => {
    ringtone.pause();
    ringtone.currentTime = 0;
    if (incomingCall) {
      acceptCall(incomingCall);
    }
  };

  const handleReject = () => {
    ringtone.pause();
    ringtone.currentTime = 0;
    if (incomingCall) {
      rejectCall(incomingCall);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <div className="mb-6">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage src={callerInfo?.avatar_url} alt={callerInfo?.display_name} />
            <AvatarFallback>
              {callerInfo?.display_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold mb-2">Incoming Call</h2>
          <p className="text-gray-600">
            {callerInfo?.display_name || 'Unknown User'}
          </p>
        </div>

        <div className="flex justify-center space-x-8">
          <Button
            onClick={handleReject}
            variant="destructive"
            size="lg"
            className="rounded-full h-16 w-16"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          
          <Button
            onClick={handleAccept}
            className="bg-green-500 hover:bg-green-600 rounded-full h-16 w-16"
            size="lg"
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
