
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
    <div className="w-80 max-w-sm rounded-2xl border border-green-200 bg-white/95 dark:bg-[#232530] shadow-2xl shadow-green-200/10 p-4 transition-all duration-300 animate-fade-in">
      <div className="flex items-center">
        <Avatar className="h-11 w-11 border border-green-300 shadow-sm bg-gradient-to-br from-green-50 via-white to-transparent">
          <AvatarImage src={avatar} />
          <AvatarFallback>{title.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="pl-3 flex-1">
          <h4 className="font-semibold text-green-700 dark:text-green-300 leading-tight">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-200 mt-0.5">
            {message}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="ml-1 text-gray-400 hover:text-red-400 rounded-full"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {type === 'call' && (
        <div className="flex justify-center gap-3 pt-3">
          <Button
            onClick={onReject}
            variant="destructive"
            size="sm"
            className="rounded-full font-semibold"
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
          <Button
            onClick={onAccept}
            className="bg-green-500 hover:bg-green-600 rounded-full font-semibold"
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
