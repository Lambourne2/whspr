import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Waves, Bed, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { MoodTag } from "@/components/ui/mood-tag";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Track } from "@shared/schema";

import whspr_white__1_ from "@assets/whspr_white (1).png";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: tracks, isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-500">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                <img 
                  src={whspr_white__1_} 
                  alt="Whspr Logo" 
                  className="w-5 h-5"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                Whspr
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                {(user as any)?.firstName || (user as any)?.email || 'User'}
              </div>
              <button 
                onClick={() => window.location.href = '/api/logout'}
                className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center hover:bg-primary-700 transition-colors text-white text-sm"
              >
                {(user as any)?.firstName?.[0] || (user as any)?.email?.[0] || 'U'}
              </button>
            </div>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4 text-white">Create Your Perfect</h2>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-6">
            Sleep Experience
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Personalized meditation and sleep tracks with AI-generated affirmations tailored to your mood and intentions.
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Link href="/create-track?type=meditation">
            <GlassmorphismCard className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 flex items-center justify-center group-hover:from-primary-500/30 group-hover:to-primary-600/30 transition-all duration-300">
                <Waves className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Custom Meditation</h3>
              <p className="text-gray-400 mb-6">
                Create guided meditations with personalized affirmations based on your current state of mind.
              </p>
              <div className="flex justify-center">
                <MoodTag>🧠 AI-Powered</MoodTag>
              </div>
            </GlassmorphismCard>
          </Link>

          <Link href="/create-track?type=sleep">
            <GlassmorphismCard className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 flex items-center justify-center group-hover:from-primary-500/30 group-hover:to-primary-600/30 transition-all duration-300">
                <Bed className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Custom Sleep Track</h3>
              <p className="text-gray-400 mb-6">
                Generate soothing sleep soundscapes with subliminal affirmations for deep, restorative rest.
              </p>
              <div className="flex justify-center">
                <MoodTag>🌙 Subliminal</MoodTag>
              </div>
            </GlassmorphismCard>
          </Link>
        </div>

        {/* Recent Tracks */}
        <div className="animate-fade-in">
          <h3 className="text-2xl font-bold mb-6 text-center text-white">Your Recent Tracks</h3>
          
          {tracksLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : tracks && tracks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {tracks.slice(0, 6).map((track) => (
                <Link key={track.id} href={`/player/${track.id}`}>
                  <GlassmorphismCard className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white group-hover:text-primary-300 transition-colors">
                          {track.title}
                        </h4>
                        <p className="text-sm text-gray-400">{track.duration} min</p>
                      </div>
                    </div>
                    {track.moodTags && track.moodTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {track.moodTags.slice(0, 2).map((tag, index) => (
                          <MoodTag key={index}>{tag}</MoodTag>
                        ))}
                      </div>
                    )}
                  </GlassmorphismCard>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <p>No tracks yet. Create your first personalized track above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
