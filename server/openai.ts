import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function generateMoodTags(journalText: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a mood analysis expert. Analyze the provided journal entry and extract 3-5 mood tags that best describe the person's emotional state. Return only a JSON array of strings, each tag should be a single word or short phrase (max 2 words). Focus on emotions, feelings, and mental states."
        },
        {
          role: "user",
          content: `Analyze this journal entry and extract mood tags: "${journalText}"`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return Array.isArray(result.tags) ? result.tags.slice(0, 5) : [];
  } catch (error) {
    console.error("Failed to generate mood tags:", error);
    return ["peaceful", "calm", "centered"]; // fallback tags
  }
}

export async function generateAffirmations(
  title: string,
  description: string,
  journalText: string,
  moodTags: string[],
  trackType: 'meditation' | 'sleep'
): Promise<string[]> {
  try {
    const context = trackType === 'sleep' 
      ? "sleep, relaxation, and peaceful rest"
      : "meditation, mindfulness, and inner peace";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in creating personalized affirmations for ${context}. Generate 8-12 positive, present-tense affirmations based on the user's current mood and intentions. Each affirmation should be 5-15 words long, encouraging, and tailored to their emotional state. Return a JSON object with an "affirmations" array.`
        },
        {
          role: "user",
          content: `Create affirmations for:
Title: ${title}
Description: ${description}
Journal: ${journalText}
Mood Tags: ${moodTags.join(', ')}
Type: ${trackType}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return Array.isArray(result.affirmations) ? result.affirmations : [];
  } catch (error) {
    console.error("Failed to generate affirmations:", error);
    // Fallback affirmations based on track type
    const fallbackAffirmations = trackType === 'sleep' 
      ? [
          "I am safe and peaceful as I drift into sleep",
          "My mind is calm and my body is relaxed",
          "I release all tension from today",
          "Tomorrow brings new opportunities and joy",
          "I am worthy of deep, restorative rest"
        ]
      : [
          "I am present and mindful in this moment",
          "Peace flows through my mind and body",
          "I am centered and grounded",
          "I breathe in calm and breathe out tension",
          "I am exactly where I need to be"
        ];
    return fallbackAffirmations;
  }
}

export async function generateAudioDescription(
  title: string,
  description: string,
  duration: number,
  trackType: 'meditation' | 'sleep'
): Promise<string> {
  // This function now returns a placeholder URL
  // The actual music generation is handled by the streaming service
  // which generates music segments on-demand during playback
  const baseUrl = process.env.AUDIO_BASE_URL || "https://example.com/audio";
  const trackId = `${trackType}_${Date.now()}`;
  return `${baseUrl}/${trackId}.mp3`;
}

export async function generateMusicPrompt(
  title: string,
  description: string,
  moodTags: string[],
  trackType: 'meditation' | 'sleep'
): Promise<string> {
  try {
    const context = trackType === 'sleep' 
      ? "sleep, relaxation, and peaceful rest"
      : "meditation, mindfulness, and inner peace";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in creating music prompts for AI music generation focused on ${context}. Generate a detailed, atmospheric prompt that describes the desired musical characteristics, instruments, mood, and ambience. The prompt should be suitable for generating calming, therapeutic music. Focus on specific instruments, textures, and environmental sounds that promote relaxation.`
        },
        {
          role: "user",
          content: `Create a music generation prompt for:
Title: ${title}
Description: ${description}
Mood Tags: ${moodTags.join(', ')}
Type: ${trackType}

The prompt should describe the musical style, instruments, tempo, and atmosphere in detail.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result.prompt || generateFallbackMusicPrompt(moodTags, trackType);
  } catch (error) {
    console.error("Failed to generate music prompt:", error);
    return generateFallbackMusicPrompt(moodTags, trackType);
  }
}

function generateFallbackMusicPrompt(moodTags: string[], trackType: 'meditation' | 'sleep'): string {
  const basePrompts = {
    sleep: [
      "Ambient sleep soundscape with soft piano and gentle rain",
      "Meditative drone with nature sounds and subtle harmonies",
      "Soft acoustic guitar with ocean waves and wind chimes",
      "Ethereal pad sounds with distant thunder and forest ambience"
    ],
    meditation: [
      "Mindful meditation soundscape with singing bowls and gentle drones",
      "Contemplative ambient music with soft bells and breathing rhythms",
      "Zen garden atmosphere with water features and subtle chimes",
      "Peaceful monastery ambience with distant chanting and nature sounds"
    ]
  };

  const prompts = basePrompts[trackType];
  let selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  // Add mood-specific adjustments
  if (moodTags.includes('anxious') || moodTags.includes('stressed')) {
    selectedPrompt += ", deeply calming and grounding";
  } else if (moodTags.includes('sad')) {
    selectedPrompt += ", comforting and nurturing";
  } else if (moodTags.includes('restless')) {
    selectedPrompt += ", settling and stabilizing";
  }

  return selectedPrompt;
}
