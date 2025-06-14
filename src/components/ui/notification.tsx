
import React from 'react';
import { X, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NotificationProps {
  id: string;
  type: 'call' | 'message';
  title: string;
  message: string;
  avatar?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onClose?: () => void;
  callType?: 'audio' | 'video';
  autoClose?: number;
}

const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  avatar,
  onAccept,
  onReject,
  onClose,
  callType,
  autoClose = 5000
}) => {
  React.useEffect(() => {
    if (type === 'message' && autoClose > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [type, autoClose, onClose]);

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 z-50 animate-in slide-in-from-right">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar} />
            <AvatarFallback>{title.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {type === 'call' && (
        <div className="flex justify-center space-x-3 mt-4">
          <Button
            onClick={onReject}
            variant="destructive"
            size="sm"
            className="rounded-full"
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
          <Button
            onClick={onAccept}
            className="bg-green-500 hover:bg-green-600 rounded-full"
            size="sm"
          >
            {callType === 'video' ? (
              <Video className="h-4 w-4 mr-1" />
            ) : (
              <Phone className="h-4 w-4 mr-1" />
            )}
            Accept
          </Button>
        </div>
      )}
    </div>
  );
};

export default Notification;
