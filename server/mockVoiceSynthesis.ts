import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface VoiceSynthesisOptions {
  text: string;
  voicePrompt?: string;
  exaggeration?: number;
  cfgWeight?: number;
  outputPath?: string;
}

export interface SynthesizedAudio {
  id: string;
  audioPath: string;
  text: string;
  duration: number;
  synthesizedAt: Date;
}

export class MockVoiceSynthesisService {
  private outputDir: string;
  private isInitialized: boolean = false;
  private sampleVoiceFiles: string[] = [];

  constructor(outputDir: string = '/tmp/synthesized_voice') {
    this.outputDir = outputDir;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Create sample voice files for testing
      await this.createSampleVoiceFiles();
      
      this.isInitialized = true;
      console.log('Mock voice synthesis service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mock voice synthesis service:', error);
      throw error;
    }
  }

  private async createSampleVoiceFiles(): Promise<void> {
    // Create sample voice files with different durations
    const sampleVoices = [
      { name: 'calm_voice_short.wav', duration: 3 },
      { name: 'calm_voice_medium.wav', duration: 5 },
      { name: 'calm_voice_long.wav', duration: 8 },
      { name: 'soothing_voice.wav', duration: 6 }
    ];

    for (const sample of sampleVoices) {
      const filePath = path.join(this.outputDir, sample.name);
      
      // Check if file already exists
      try {
        await fs.access(filePath);
        this.sampleVoiceFiles.push(filePath);
        continue;
      } catch {
        // File doesn't exist, create it
      }

      // Create a simple WAV file (silent audio for testing)
      const wavHeader = this.createWavHeader(sample.duration);
      const silentAudio = Buffer.alloc(sample.duration * 44100 * 2 * 2); // 44.1kHz, 16-bit, stereo
      const wavFile = Buffer.concat([wavHeader, silentAudio]);
      
      await fs.writeFile(filePath, wavFile);
      this.sampleVoiceFiles.push(filePath);
      console.log(`Created sample voice file: ${sample.name}`);
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

  private generateCalmingAffirmationText(baseText: string): string {
    // Enhance affirmation text for better TTS delivery
    const enhancedText = baseText
      .replace(/\./g, '... ') // Add pauses after periods
      .replace(/,/g, ', ') // Slight pause after commas
      .trim();

    // Add breathing cues for relaxation
    return `Take a gentle breath... ${enhancedText}... Let this truth settle into your heart.`;
  }

  private estimateAudioDuration(text: string): number {
    // Rough estimation: average speaking rate is about 150 words per minute
    // For calm affirmations, we use a slower rate of about 100 words per minute
    const words = text.split(/\s+/).length;
    const wordsPerSecond = 100 / 60; // 100 words per minute
    return Math.ceil(words / wordsPerSecond);
  }

  async synthesizeAffirmation(
    text: string, 
    options: Partial<VoiceSynthesisOptions> = {}
  ): Promise<SynthesizedAudio> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const audioId = uuidv4();
    const outputPath = options.outputPath || path.join(this.outputDir, `${audioId}.wav`);
    
    // Enhance text for affirmation delivery
    const enhancedText = this.generateCalmingAffirmationText(text);
    
    console.log(`Mock synthesizing affirmation: "${text}"`);

    try {
      // Simulate synthesis time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Copy a random sample voice file to the output path
      const sampleFile = this.sampleVoiceFiles[Math.floor(Math.random() * this.sampleVoiceFiles.length)];
      await fs.copyFile(sampleFile, outputPath);
      
      // Get estimated duration
      const estimatedDuration = this.estimateAudioDuration(enhancedText);
      
      const synthesizedAudio: SynthesizedAudio = {
        id: audioId,
        audioPath: outputPath,
        text: text,
        duration: estimatedDuration,
        synthesizedAt: new Date()
      };

      console.log(`Mock synthesized affirmation: ${audioId}`);
      return synthesizedAudio;
    } catch (error) {
      console.error('Failed to synthesize mock affirmation:', error);
      throw error;
    }
  }

  async synthesizeAffirmationSequence(
    affirmations: string[], 
    options: Partial<VoiceSynthesisOptions> = {}
  ): Promise<SynthesizedAudio[]> {
    const synthesizedAudios: SynthesizedAudio[] = [];

    for (let i = 0; i < affirmations.length; i++) {
      const affirmation = affirmations[i];
      const audioOptions = {
        ...options,
        outputPath: path.join(this.outputDir, `affirmation_${i}_${uuidv4()}.wav`)
      };

      try {
        const synthesizedAudio = await this.synthesizeAffirmation(affirmation, audioOptions);
        synthesizedAudios.push(synthesizedAudio);
        console.log(`Mock synthesized affirmation ${i + 1}/${affirmations.length}`);
      } catch (error) {
        console.error(`Failed to synthesize mock affirmation ${i + 1}:`, error);
        // Continue with other affirmations even if one fails
      }
    }

    return synthesizedAudios;
  }

  async createCustomVoicePrompt(audioBuffer: Buffer, outputPath?: string): Promise<string> {
    const voicePromptPath = outputPath || path.join(this.outputDir, `voice_prompt_${uuidv4()}.wav`);
    
    try {
      await fs.writeFile(voicePromptPath, audioBuffer);
      console.log(`Mock custom voice prompt saved to: ${voicePromptPath}`);
      return voicePromptPath;
    } catch (error) {
      console.error('Failed to save mock custom voice prompt:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up old synthesized files (older than 1 hour)
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      for (const file of files) {
        // Don't clean up sample files
        if (this.sampleVoiceFiles.some(sample => sample.endsWith(file))) {
          continue;
        }

        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > oneHour) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old mock voice file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old mock voice files:', error);
    }
  }
}

// Export singleton instance
export const mockVoiceSynthesisService = new MockVoiceSynthesisService();

