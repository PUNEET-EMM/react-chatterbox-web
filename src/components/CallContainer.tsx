
import React from 'react';
import { useAudioCall } from '@/hooks/useAudioCall';
import { useChatInfo } from '@/hooks/useChatInfo';
import { useAuth } from '@/contexts/AuthContext';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallModal from './ActiveCallModal';

const CallContainer: React.FC = () => {
  const { user } = useAuth();
  const {
    incomingCall,
    currentCall,
    isCallActive,
    answerCall,
    rejectCall,
    endCall,
    remoteAudioRef
  } = useAudioCall();

  // Get caller info for incoming call
  const callerId = incomingCall?.caller_id;
  const { chatInfo: callerInfo } = useChatInfo(callerId || '', user?.id);

  // Get participant info for active call
  const participantId = currentCall 
    ? (currentCall.caller_id === user?.id ? currentCall.receiver_id : currentCall.caller_id)
    : '';
  const { chatInfo: participantInfo } = useChatInfo(participantId, user?.id);

  const handleAnswerCall = () => {
    if (incomingCall) {
      answerCall(incomingCall);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      rejectCall(incomingCall);
    }
  };

  return (
    <>
      <IncomingCallModal
        call={incomingCall}
        callerName={callerInfo?.otherParticipant?.display_name || 'Unknown'}
        callerAvatar={callerInfo?.otherParticipant?.avatar_url}
        onAnswer={handleAnswerCall}
        onReject={handleRejectCall}
      />
      
      <ActiveCallModal
        isOpen={isCallActive && !!currentCall}
        participantName={participantInfo?.otherParticipant?.display_name || 'Unknown'}
        participantAvatar={participantInfo?.otherParticipant?.avatar_url}
        onEndCall={endCall}
        remoteAudioRef={remoteAudioRef}
      />
    </>
  );
};

export default CallContainer;
