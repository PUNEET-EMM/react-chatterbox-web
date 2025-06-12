
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';

interface CallButtonProps {
  onAudioCall: () => void;
  onVideoCall: () => void;
  disabled?: boolean;
}

const CallButton: React.FC<CallButtonProps> = ({ onAudioCall, onVideoCall, disabled = false }) => {
  return (
    <div className="flex space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onAudioCall}
        disabled={disabled}
        className="text-gray-500 hover:text-gray-700"
      >
        <Phone className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onVideoCall}
        disabled={disabled}
        className="text-gray-500 hover:text-gray-700"
      >
        <Video className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default CallButton;
