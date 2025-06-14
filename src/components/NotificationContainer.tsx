
import React from 'react';
import Notification from './ui/notification';
import { useNotifications } from '@/hooks/useNotifications';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 flex flex-col items-end pointer-events-none">
      {notifications.map((notification, i) => (
        <div
          key={notification.id}
          className="pointer-events-auto transition-transform duration-300 animate-slide-in-right"
          style={{
            animationDelay: `${i * 80}ms`
          }}
        >
          <Notification
            {...notification}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
