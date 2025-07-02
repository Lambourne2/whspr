import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Edit, Heart, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { MoodTag } from "@/components/ui/mood-tag";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertTrackSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertTrackSchema.extend({
  title: z.string().min(1, "Title is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateTrack() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get track type from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const trackType = urlParams.get('type') || 'meditation';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      journalPrompt: "",
      duration: 30,
      trackType: trackType as 'meditation' | 'sleep',
    },
  });

  const watchJournalPrompt = form.watch("journalPrompt");

  // Generate mood tags from journal text
  const generateTagsMutation = useMutation({
    mutationFn: async (journal: string) => {
      const response = await apiRequest("POST", "/api/generateTags", { journal });
      return await response.json();
    },
    onSuccess: (data) => {
      setGeneratedTags(data.tags || []);
      setIsAnalyzing(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      console.error("Error generating tags:", error);
      setIsAnalyzing(false);
    },
  });

  // Generate complete track
  const generateTrackMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/generateTrack", data);
      return await response.json();
    },
    onSuccess: (track) => {
      toast({
        title: "Track Generated!",
        description: "Your personalized track is ready to play.",
      });
      navigate(`/player/${track.id}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to generate track. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Analyze journal text for mood tags
  useEffect(() => {
    if (watchJournalPrompt && watchJournalPrompt.trim().length > 10) {
      setIsAnalyzing(true);
      const timeoutId = setTimeout(() => {
        generateTagsMutation.mutate(watchJournalPrompt);
      }, 1500);

      return () => clearTimeout(timeoutId);
    } else {
      setGeneratedTags([]);
    }
  }, [watchJournalPrompt]);

  const onSubmit = (data: FormData) => {
    generateTrackMutation.mutate(data);
  };

  const formatDuration = (minutes: number) => {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-500">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="mr-4 w-10 h-10 rounded-full bg-dark-600 hover:bg-dark-500 text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-3xl font-bold text-white">Create Your Track</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Information */}
              <GlassmorphismCard className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
                  <Edit className="text-primary-400 mr-3 w-5 h-5" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Track Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Peaceful Night Sleep"
                            className="bg-dark-600 border-gray-700 text-white placeholder-gray-400 focus:ring-primary-500 focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Describe what you want this track to help you achieve..."
                            className="bg-dark-600 border-gray-700 text-white placeholder-gray-400 focus:ring-primary-500 focus:border-transparent resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </GlassmorphismCard>

              {/* Journal & Mood */}
              <GlassmorphismCard className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
                  <Heart className="text-primary-400 mr-3 w-5 h-5" />
                  Journal & Mood
                </h3>
                
                <FormField
                  control={form.control}
                  name="journalPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">How are you feeling right now?</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Write 1-2 sentences about your current mood, what's on your mind, or what you need right now..."
                          className="bg-dark-600 border-gray-700 text-white placeholder-gray-400 focus:ring-primary-500 focus:border-transparent resize-none"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-2">
                        This helps AI generate personalized affirmations for you
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mood Tags */}
                <div className="mt-4">
                  <FormLabel className="text-gray-300 mb-2 block">AI-Generated Mood Tags</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {isAnalyzing ? (
                      <div className="px-3 py-1 bg-gray-600 text-gray-400 rounded-full text-sm animate-pulse">
                        Analyzing mood...
                      </div>
                    ) : generatedTags.length > 0 ? (
                      generatedTags.map((tag, index) => (
                        <MoodTag key={index} className="animate-fade-in">
                          {tag}
                        </MoodTag>
                      ))
                    ) : watchJournalPrompt && watchJournalPrompt.trim().length > 0 ? (
                      <div className="text-sm text-gray-500">
                        Keep writing to generate mood tags...
                      </div>
                    ) : null}
                  </div>
                </div>
              </GlassmorphismCard>

              {/* Duration */}
              <GlassmorphismCard className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
                  <Clock className="text-primary-400 mr-3 w-5 h-5" />
                  Duration
                </h3>
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 mb-2 block">
                        Track Length: <span className="text-primary-400">{formatDuration(field.value)}</span>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={5}
                          max={120}
                          step={5}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5 min</span>
                        <span>120 min</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </GlassmorphismCard>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={generateTrackMutation.isPending || !form.formState.isValid}
                className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Sparkles className="mr-2 w-5 h-5" />
                {generateTrackMutation.isPending ? "Generating..." : "Generate My Track"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
