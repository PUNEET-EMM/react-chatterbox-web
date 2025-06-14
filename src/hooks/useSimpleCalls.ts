
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

interface SimpleCall {
  id: string;
  callType: 'audio' | 'video';
  callerName: string;
  calleeName: string;
  isInitiator: boolean;
  status: 'calling' | 'active' | 'ended';
}

export const useSimpleCalls = () => {
  const { user } = useAuth();
  const { addNotification, removeNotification } = useNotifications();
  const [activeCall, setActiveCall] = useState<SimpleCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<SimpleCall | null>(null);

  const initiateCall = useCallback((calleeName: string, callType: 'audio' | 'video') => {
    if (!user) return;

    const call: SimpleCall = {
      id: Math.random().toString(36).substr(2, 9),
      callType,
      callerName: user.user_metadata?.display_name || 'You',
      calleeName,
      isInitiator: true,
      status: 'calling'
    };

    console.log('Initiating simple call:', call);
    
    // Simulate incoming call for demo
    setTimeout(() => {
      const notificationId = addNotification({
        type: 'call',
        title: `${call.callerName}`,
        message: `Incoming ${callType} call`,
        callType,
        onAccept: () => {
          removeNotification(notificationId);
          setIncomingCall(null);
          setActiveCall({ ...call, status: 'active' });
        },
        onReject: () => {
          removeNotification(notificationId);
          setIncomingCall(null);
        }
      });
      
      setIncomingCall(call);
    }, 1000);

    return call;
  }, [user, addNotification, removeNotification]);

  const acceptCall = useCallback((call: SimpleCall) => {
    console.log('Accepting simple call:', call);
    setIncomingCall(null);
    setActiveCall({ ...call, status: 'active' });
  }, []);

  const rejectCall = useCallback((call: SimpleCall) => {
    console.log('Rejecting simple call:', call);
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(() => {
    console.log('Ending simple call');
    setActiveCall(null);
    setIncomingCall(null);
  }, []);

  return {
    activeCall,
    incomingCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall
  };
};
