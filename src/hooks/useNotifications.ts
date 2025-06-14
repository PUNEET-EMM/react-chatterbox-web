
import { useState, useCallback } from 'react';

export interface NotificationData {
  id: string;
  type: 'call' | 'message';
  title: string;
  message: string;
  avatar?: string;
  onAccept?: () => void;
  onReject?: () => void;
  callType?: 'audio' | 'video';
  autoClose?: number;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    setNotifications(prev => [...prev, newNotification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
};
