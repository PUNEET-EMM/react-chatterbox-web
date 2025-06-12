
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AudioRecorderProps {
  onAudioSent: (audioUrl: string) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioSent, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('chat-audios')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-audios')
        .getPublicUrl(data.path);

      onAudioSent(urlData.publicUrl);
      setAudioBlob(null);
    } catch (error) {
      console.error('Error uploading audio:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
  };

  if (audioBlob) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
        <audio controls className="flex-1">
          <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
        </audio>
        <Button
          onClick={uploadAudio}
          disabled={isUploading}
          size="sm"
          className="bg-green-500 hover:bg-green-600"
        >
          <Send className="h-4 w-4" />
        </Button>
        <Button
          onClick={discardRecording}
          disabled={isUploading}
          size="sm"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      size="sm"
      variant={isRecording ? "destructive" : "ghost"}
      className={isRecording ? "animate-pulse" : ""}
    >
      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};

export default AudioRecorder;
