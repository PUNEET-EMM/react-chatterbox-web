
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useAudioCall } from '@/hooks/useAudioCall';
import { useToast } from '@/hooks/use-toast';

interface CallButtonProps {
  userId: string;
  disabled?: boolean;
}

const CallButton: React.FC<CallButtonProps> = ({ userId, disabled }) => {
  const { startCall, isConnecting, isSocketConnected } = useAudioCall();
  const { toast } = useToast();

  const handleCall = async () => {
    if (!isSocketConnected) {
      toast({
        title: "Connection Error",
        description: "Cannot start call. WebSocket connection is not established.",
        variant: "destructive"
      });
      return;
    }

    const result = await startCall(userId);
    if (!result) {
      toast({
        title: "Call Failed",
        description: "Unable to start the call. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isButtonDisabled = disabled || isConnecting || !isSocketConnected;

  return (
    <Button
      onClick={handleCall}
      disabled={isButtonDisabled}
      size="sm"
      variant="ghost"
      className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${
        !isSocketConnected ? 'opacity-50' : ''
      }`}
      title={!isSocketConnected ? 'Connecting...' : 'Start call'}
    >
      <Phone className="h-4 w-4" />
    </Button>
  );
};

export default CallButton;
