
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useAudioCall } from '@/hooks/useAudioCall';

interface CallButtonProps {
  userId: string;
  disabled?: boolean;
}

const CallButton: React.FC<CallButtonProps> = ({ userId, disabled }) => {
  const { startCall, isConnecting } = useAudioCall();

  const handleCall = () => {
    startCall(userId);
  };

  return (
    <Button
      onClick={handleCall}
      disabled={disabled || isConnecting}
      size="sm"
      variant="ghost"
      className="text-green-600 hover:text-green-700 hover:bg-green-50"
    >
      <Phone className="h-4 w-4" />
    </Button>
  );
};

export default CallButton;
