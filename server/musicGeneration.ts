import { spawn, ChildProcess } from 'child_process';
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

export class MusicGenerationService {
  private diffRhythmPath: string;
  private outputDir: string;
  private isInitialized: boolean = false;

  constructor(diffRhythmPath: string = '/opt/DiffRhythm', outputDir: string = '/tmp/generated_music') {
    this.diffRhythmPath = diffRhythmPath;
    this.outputDir = outputDir;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Check if DiffRhythm is available
      await this.checkDiffRhythmAvailability();
      
      this.isInitialized = true;
      console.log('Music generation service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize music generation service:', error);
      throw error;
    }
  }

  private async checkDiffRhythmAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkProcess = spawn('python', ['-c', 'import torch; print("PyTorch available")'], {
        cwd: this.diffRhythmPath
      });

      checkProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('DiffRhythm dependencies not available'));
        }
      });

      checkProcess.on('error', (error) => {
        reject(new Error(`Failed to check DiffRhythm: ${error.message}`));
      });
    });
  }

  private generateSleepMusicPrompt(moodTags: string[]): string {
    const basePrompts = [
      "Ambient sleep soundscape with soft piano and gentle rain",
      "Meditative drone with nature sounds and subtle harmonies",
      "Soft acoustic guitar with ocean waves and wind chimes",
      "Ethereal pad sounds with distant thunder and forest ambience",
      "Gentle string harmonies with flowing water and bird songs"
    ];

    // Customize prompt based on mood tags
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
    
    // Add mood-specific adjustments
    for (const tag of moodTags) {
      const adjustment = moodAdjustments[tag.toLowerCase()];
      if (adjustment) {
        selectedPrompt += `, ${adjustment}`;
        break; // Only apply first matching adjustment
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

    console.log(`Generating music with prompt: ${prompt}`);

    try {
      await this.runDiffRhythm(prompt, outputPath, options.duration);
      
      const segment: GeneratedSegment = {
        id: segmentId,
        audioPath: outputPath,
        duration: options.duration,
        prompt: prompt,
        generatedAt: new Date()
      };

      return segment;
    } catch (error) {
      console.error('Failed to generate music segment:', error);
      throw error;
    }
  }

  private async runDiffRhythm(prompt: string, outputPath: string, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a temporary config file for this generation
      const configData = {
        prompt: prompt,
        duration: duration,
        output_path: outputPath,
        sample_rate: 44100,
        guidance_scale: 3.5,
        num_inference_steps: 50,
        seed: Math.floor(Math.random() * 1000000)
      };

      const configPath = path.join(this.outputDir, `config_${Date.now()}.json`);
      
      fs.writeFile(configPath, JSON.stringify(configData, null, 2))
        .then(() => {
          // Run DiffRhythm inference
          const inferProcess = spawn('python', [
            path.join(this.diffRhythmPath, 'infer', 'infer.py'),
            '--config', configPath,
            '--prompt', prompt,
            '--output', outputPath,
            '--duration', duration.toString()
          ], {
            cwd: this.diffRhythmPath,
            env: { ...process.env, PYTHONPATH: this.diffRhythmPath }
          });

          let stdout = '';
          let stderr = '';

          inferProcess.stdout?.on('data', (data) => {
            stdout += data.toString();
            console.log('DiffRhythm:', data.toString().trim());
          });

          inferProcess.stderr?.on('data', (data) => {
            stderr += data.toString();
            console.error('DiffRhythm Error:', data.toString().trim());
          });

          inferProcess.on('close', async (code) => {
            // Clean up config file
            try {
              await fs.unlink(configPath);
            } catch (e) {
              console.warn('Failed to clean up config file:', e);
            }

            if (code === 0) {
              // Verify output file exists
              try {
                await fs.access(outputPath);
                resolve();
              } catch (e) {
                reject(new Error('Generated audio file not found'));
              }
            } else {
              reject(new Error(`DiffRhythm process failed with code ${code}: ${stderr}`));
            }
          });

          inferProcess.on('error', (error) => {
            reject(new Error(`Failed to start DiffRhythm process: ${error.message}`));
          });
        })
        .catch(reject);
    });
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
        console.log(`Generated segment ${i + 1}/${segmentCount}`);
      } catch (error) {
        console.error(`Failed to generate segment ${i + 1}:`, error);
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
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > oneHour) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
    }
  }
}

// Export singleton instance
export const musicGenerationService = new MusicGenerationService();

