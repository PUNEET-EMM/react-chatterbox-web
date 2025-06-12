
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  callerName,
  callType,
  onAccept,
  onReject
}) => {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                {callType === 'video' ? (
                  <Video className="h-8 w-8 text-green-600" />
                ) : (
                  <Phone className="h-8 w-8 text-green-600" />
                )}
              </div>
              <p className="text-lg font-medium">{callerName}</p>
              <p className="text-sm text-gray-500">
                wants to {callType === 'video' ? 'video' : 'voice'} call you
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-center space-x-4 mt-6">
          <Button
            onClick={onReject}
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            onClick={onAccept}
            className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
            size="lg"
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default IncomingCallModal;
