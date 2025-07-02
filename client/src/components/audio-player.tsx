import { useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAudio } from "@/hooks/useAudio";
import { Track } from "@shared/schema";

import whspr_white__1_ from "@assets/whspr_white (1).png";

interface AudioPlayerProps {
  track: Track;
  onClose: () => void;
}

export function AudioPlayer({ track, onClose }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, toggle, seek } = useAudio(track.audioUrl || undefined);
  const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);

  // Rotate affirmations every 30 seconds
  useEffect(() => {
    if (!track.affirmations || track.affirmations.length === 0) return;

    const interval = setInterval(() => {
      setCurrentAffirmationIndex(prev => 
        (prev + 1) % track.affirmations!.length
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [track.affirmations]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const currentAffirmation = track.affirmations?.[currentAffirmationIndex];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-dark-400 via-dark-300 to-dark-500 flex flex-col">
      <div className="container mx-auto px-4 py-8 h-full flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-dark-600 hover:bg-dark-500 text-gray-400"
          >
            ✕
          </Button>
          <h2 className="text-xl font-semibold text-white">{track.title}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-dark-600 hover:bg-dark-500 text-gray-400"
          >
            ♡
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          
          {/* Visualization */}
          <div className="w-80 h-80 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-primary-600/10 animate-pulse" />
            <div className="relative z-10 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                <img 
                  src={whspr_white__1_} 
                  alt="Whspr Logo" 
                  className="w-16 h-16"
                />
              </div>
              {isPlaying && (
                <div className="flex justify-center space-x-1 scale-150">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-full animate-pulse"
                      style={{
                        height: Math.random() * 20 + 5,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '1.5s'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Affirmation Display */}
          <div className="text-center mb-8 h-16 flex items-center justify-center">
            {currentAffirmation && (
              <p className="text-lg text-primary-300 italic transition-all duration-500 animate-fade-in">
                "{currentAffirmation}"
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full mb-2"
            />
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center justify-center space-x-6 mb-8">
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-dark-600 hover:bg-dark-500 text-gray-400"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={toggle}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-dark-600 hover:bg-dark-500 text-gray-400"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Additional Controls */}
          <div className="flex items-center justify-center space-x-8 text-gray-400">
            <Button variant="ghost" size="icon" className="hover:text-white">
              <Volume2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:text-white">
              <Download className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:text-white">
              <Share className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
