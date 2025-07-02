import { useState, useRef, useEffect } from 'react';

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export function useAudio(src?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
  });

  useEffect(() => {
    if (src && !audioRef.current) {
      audioRef.current = new Audio(src);
      const audio = audioRef.current;

      const updateTime = () => {
        setState(prev => ({
          ...prev,
          currentTime: audio.currentTime,
          duration: audio.duration || 0,
        }));
      };

      const handleLoadedMetadata = () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration || 0,
        }));
      };

      const handleEnded = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0,
        }));
      };

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [src]);

  const play = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
      setState(prev => ({ ...prev, volume }));
    }
  };

  const toggle = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return {
    ...state,
    play,
    pause,
    seek,
    setVolume,
    toggle,
  };
}
