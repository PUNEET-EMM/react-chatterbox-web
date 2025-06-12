
import React from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, className = "" }) => {
  return (
    <audio 
      controls 
      className={`w-full max-w-xs ${className}`}
      preload="metadata"
    >
      <source src={audioUrl} type="audio/webm" />
      <source src={audioUrl} type="audio/mp4" />
      <source src={audioUrl} type="audio/mpeg" />
      Your browser does not support the audio element.
    </audio>
  );
};

export default AudioPlayer;
