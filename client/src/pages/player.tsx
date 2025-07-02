import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { AudioPlayer } from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Track } from "@shared/schema";

export default function Player() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: track, isLoading, error } = useQuery<Track>({
    queryKey: [`/api/tracks/${id}`],
    enabled: !!id,
    retry: false,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
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
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-500 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Track Not Found</h2>
          <p className="text-gray-400 mb-6">The requested track could not be found.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <AudioPlayer track={track} onClose={() => navigate("/")} />;
}
