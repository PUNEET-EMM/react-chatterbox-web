
import React from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioCall } from '@/hooks/useAudioCall';
import { toast } from 'sonner';

interface CallButtonProps {
  userId: string;
  chatId?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

const CallButton: React.FC<CallButtonProps> = ({ 
  userId, 
  chatId, 
  variant = 'ghost',
  size = 'icon'
}) => {
  const { startCall, isInCall } = useAudioCall();

  const handleCall = async () => {
    if (isInCall) {
      toast.error('You are already in a call');
      return;
    }

    try {
      await startCall(userId, chatId);
      toast.success('Calling...');
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start call. Please check your microphone permissions.');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCall}
      disabled={isInCall}
      className="hover:bg-green-100 hover:text-green-600"
    >
      <Phone className="h-4 w-4" />
    </Button>
  );
};

export default CallButton;
