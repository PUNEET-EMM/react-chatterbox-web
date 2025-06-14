
import React from 'react';
import { useAudioCall } from '@/hooks/useAudioCall';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallModal from './ActiveCallModal';

const CallContainer: React.FC = () => {
  const { incomingCall, isInCall } = useAudioCall();

  return (
    <>
      {incomingCall && <IncomingCallModal />}
      {isInCall && <ActiveCallModal />}
    </>
  );
};

export default CallContainer;
