
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff } from 'lucide-react';
import { Call } from '@/hooks/useAudioCall';

interface IncomingCallModalProps {
  call: Call | null;
  callerName: string;
  callerAvatar?: string;
  onAnswer: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  callerName,
  callerAvatar,
  onAnswer,
  onReject
}) => {
  return (
    <Dialog open={!!call}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Incoming Call</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={callerAvatar} alt={callerName} />
            <AvatarFallback className="text-2xl">
              {callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold">{callerName}</h3>
            <p className="text-gray-500">is calling you...</p>
          </div>
          
          <div className="flex space-x-4">
            <Button
              onClick={onReject}
              size="lg"
              variant="destructive"
              className="rounded-full h-16 w-16"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            <Button
              onClick={onAnswer}
              size="lg"
              className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
