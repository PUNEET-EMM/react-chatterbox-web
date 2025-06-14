
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send, StopCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AudioRecorderProps {
  onAudioSent: (audioUrl: string) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioSent, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
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
    } catch (err: any) {
      setError("Microphone permission denied or unavailable.");
      setIsRecording(false);
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
    setError(null);
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('chat-audios')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-audios')
        .getPublicUrl(data.path);

      onAudioSent(urlData.publicUrl);
      setAudioBlob(null);
    } catch (err) {
      setError("Failed to send audio, please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setError(null);
  };

  return (
    <div>
      {/* If recording has finished */}
      {audioBlob ? (
        <div className="flex items-center gap-3 bg-gradient-to-r from-white via-green-50 to-teal-50 dark:from-sidebar dark:via-sidebar dark:to-[#262936] rounded-xl border border-green-200 px-4 py-2 shadow animate-fade-in">
          <audio controls className="h-8 max-w-[90px]" style={{ flex: 1 }}>
            <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
          </audio>
          <Button
            onClick={uploadAudio}
            disabled={isUploading}
            size="sm"
            className="rounded-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
            aria-label="Send audio"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-1 text-xs">{isUploading ? "Sending..." : "Send"}</span>
          </Button>
          <Button
            onClick={discardRecording}
            disabled={isUploading}
            size="icon"
            variant="outline"
            className="rounded-full border-red-200 text-red-400 hover:bg-red-50"
            aria-label="Cancel"
          >
            <MicOff className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          size="icon"
          variant={isRecording ? "destructive" : "ghost"}
          className={`rounded-full ${isRecording ? 'bg-red-500 text-white shadow pulse' : 'text-green-500 hover:bg-green-50'} transition-all duration-200`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
      )}
      <div className="min-h-5 mt-1 text-xs text-red-400 px-1">
        {error}
        {isRecording && <span className="text-green-500"> ● Recording...</span>}
      </div>
    </div>
  );
};

export default AudioRecorder;
