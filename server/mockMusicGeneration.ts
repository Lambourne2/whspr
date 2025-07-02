import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface MusicGenerationOptions {
  prompt: string;
  duration: number; // in seconds
  trackType: 'meditation' | 'sleep';
  moodTags: string[];
  outputPath?: string;
}

export interface GeneratedSegment {
  id: string;
  audioPath: string;
  duration: number;
  prompt: string;
  generatedAt: Date;
}

export class MockMusicGenerationService {
  private outputDir: string;
  private isInitialized: boolean = false;
  private sampleAudioFiles: string[] = [];

  constructor(outputDir: string = '/tmp/generated_music') {
    this.outputDir = outputDir;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Create sample audio files for testing
      await this.createSampleAudioFiles();
      
      this.isInitialized = true;
      console.log('Mock music generation service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mock music generation service:', error);
      throw error;
    }
  }

  private async createSampleAudioFiles(): Promise<void> {
    // Create simple WAV files with different durations for testing
    const sampleFiles = [
      { name: 'sleep_ambient.wav', duration: 60 },
      { name: 'meditation_bells.wav', duration: 60 },
      { name: 'nature_sounds.wav', duration: 60 },
      { name: 'piano_calm.wav', duration: 60 }
    ];

    for (const sample of sampleFiles) {
      const filePath = path.join(this.outputDir, sample.name);
      
      // Check if file already exists
      try {
        await fs.access(filePath);
        this.sampleAudioFiles.push(filePath);
        continue;
      } catch {
        // File doesn't exist, create it
      }

      // Create a simple WAV file (silent audio for testing)
      const wavHeader = this.createWavHeader(sample.duration);
      const silentAudio = Buffer.alloc(sample.duration * 44100 * 2 * 2); // 44.1kHz, 16-bit, stereo
      const wavFile = Buffer.concat([wavHeader, silentAudio]);
      
      await fs.writeFile(filePath, wavFile);
      this.sampleAudioFiles.push(filePath);
      console.log(`Created sample audio file: ${sample.name}`);
    }
  }

  private createWavHeader(durationSeconds: number): Buffer {
    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    const dataSize = durationSeconds * sampleRate * numChannels * (bitsPerSample / 8);
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    
    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20); // audio format (PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // byte rate
    header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // block align
    header.writeUInt16LE(bitsPerSample, 34);
    
    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    
    return header;
  }

  private generateSleepMusicPrompt(moodTags: string[]): string {
    const basePrompts = [
      "Ambient sleep soundscape with soft piano and gentle rain",
      "Meditative drone with nature sounds and subtle harmonies",
      "Soft acoustic guitar with ocean waves and wind chimes",
      "Ethereal pad sounds with distant thunder and forest ambience",
      "Gentle string harmonies with flowing water and bird songs"
    ];

    const moodAdjustments: { [key: string]: string } = {
      'anxious': 'deeply calming and grounding',
      'stressed': 'tension-releasing and soothing',
      'sad': 'comforting and nurturing',
      'excited': 'gently slowing and peaceful',
      'angry': 'cooling and harmonious',
      'peaceful': 'maintaining serenity',
      'tired': 'restorative and healing',
      'restless': 'settling and stabilizing'
    };

    let selectedPrompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];
    
    for (const tag of moodTags) {
      const adjustment = moodAdjustments[tag.toLowerCase()];
      if (adjustment) {
        selectedPrompt += `, ${adjustment}`;
        break;
      }
    }

    return selectedPrompt;
  }

  private generateMeditationMusicPrompt(moodTags: string[]): string {
    const basePrompts = [
      "Mindful meditation soundscape with singing bowls and gentle drones",
      "Contemplative ambient music with soft bells and breathing rhythms",
      "Zen garden atmosphere with water features and subtle chimes",
      "Peaceful monastery ambience with distant chanting and nature sounds",
      "Grounding earth tones with deep resonant frequencies"
    ];

    const moodAdjustments: { [key: string]: string } = {
      'anxious': 'anxiety-reducing and centering',
      'scattered': 'focus-enhancing and clarifying',
      'overwhelmed': 'simplifying and spacious',
      'restless': 'grounding and stabilizing',
      'curious': 'exploratory and opening',
      'grateful': 'heart-opening and warm',
      'focused': 'concentration-supporting',
      'spiritual': 'transcendent and elevating'
    };

    let selectedPrompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];
    
    for (const tag of moodTags) {
      const adjustment = moodAdjustments[tag.toLowerCase()];
      if (adjustment) {
        selectedPrompt += `, ${adjustment}`;
        break;
      }
    }

    return selectedPrompt;
  }

  async generateMusicSegment(options: MusicGenerationOptions): Promise<GeneratedSegment> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const segmentId = uuidv4();
    const outputPath = options.outputPath || path.join(this.outputDir, `${segmentId}.wav`);

    // Generate appropriate prompt based on track type
    const prompt = options.trackType === 'sleep' 
      ? this.generateSleepMusicPrompt(options.moodTags)
      : this.generateMeditationMusicPrompt(options.moodTags);

    console.log(`Mock generating music with prompt: ${prompt}`);

    try {
      // Simulate generation time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Copy a random sample file to the output path
      const sampleFile = this.sampleAudioFiles[Math.floor(Math.random() * this.sampleAudioFiles.length)];
      await fs.copyFile(sampleFile, outputPath);
      
      const segment: GeneratedSegment = {
        id: segmentId,
        audioPath: outputPath,
        duration: options.duration,
        prompt: prompt,
        generatedAt: new Date()
      };

      console.log(`Mock generated music segment: ${segmentId}`);
      return segment;
    } catch (error) {
      console.error('Failed to generate mock music segment:', error);
      throw error;
    }
  }

  async generateStreamingSegments(
    options: MusicGenerationOptions, 
    segmentCount: number = 3
  ): Promise<GeneratedSegment[]> {
    const segments: GeneratedSegment[] = [];
    const segmentDuration = Math.ceil(options.duration / segmentCount);

    for (let i = 0; i < segmentCount; i++) {
      const segmentOptions = {
        ...options,
        duration: segmentDuration,
        outputPath: path.join(this.outputDir, `${uuidv4()}_segment_${i}.wav`)
      };

      try {
        const segment = await this.generateMusicSegment(segmentOptions);
        segments.push(segment);
        console.log(`Mock generated segment ${i + 1}/${segmentCount}`);
      } catch (error) {
        console.error(`Failed to generate mock segment ${i + 1}:`, error);
        // Continue with other segments even if one fails
      }
    }

    return segments;
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up old generated files (older than 1 hour)
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      for (const file of files) {
        // Don't clean up sample files
        if (this.sampleAudioFiles.some(sample => sample.endsWith(file))) {
          continue;
        }

        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > oneHour) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old mock file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old mock files:', error);
    }
  }
}

// Export singleton instance
export const mockMusicGenerationService = new MockMusicGenerationService();

