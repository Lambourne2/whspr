import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface VoiceSynthesisOptions {
  text: string;
  voicePrompt?: string; // Path to reference voice file
  exaggeration?: number; // 0.0 to 1.0
  cfgWeight?: number; // 0.0 to 1.0
  outputPath?: string;
}

export interface SynthesizedAudio {
  id: string;
  audioPath: string;
  text: string;
  duration: number;
  synthesizedAt: Date;
}

export class VoiceSynthesisService {
  private chatterboxPath: string;
  private outputDir: string;
  private isInitialized: boolean = false;
  private defaultVoicePrompt: string;

  constructor(
    chatterboxPath: string = '/opt/chatterbox', 
    outputDir: string = '/tmp/synthesized_voice',
    defaultVoicePrompt: string = '/opt/chatterbox/default_voice.wav'
  ) {
    this.chatterboxPath = chatterboxPath;
    this.outputDir = outputDir;
    this.defaultVoicePrompt = defaultVoicePrompt;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Check if Chatterbox is available
      await this.checkChatterboxAvailability();
      
      this.isInitialized = true;
      console.log('Voice synthesis service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize voice synthesis service:', error);
      throw error;
    }
  }

  private async checkChatterboxAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkProcess = spawn('python', ['-c', 'import chatterbox; print("Chatterbox available")'], {
        cwd: this.chatterboxPath
      });

      checkProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Chatterbox not available'));
        }
      });

      checkProcess.on('error', (error) => {
        reject(new Error(`Failed to check Chatterbox: ${error.message}`));
      });
    });
  }

  private generateCalminAffirmationText(baseText: string): string {
    // Enhance affirmation text for better TTS delivery
    const enhancedText = baseText
      .replace(/\./g, '... ') // Add pauses after periods
      .replace(/,/g, ', ') // Slight pause after commas
      .trim();

    // Add breathing cues for relaxation
    return `Take a gentle breath... ${enhancedText}... Let this truth settle into your heart.`;
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
    const enhancedText = this.generateCalminAffirmationText(text);
    
    const synthesisOptions: VoiceSynthesisOptions = {
      text: enhancedText,
      voicePrompt: options.voicePrompt || this.defaultVoicePrompt,
      exaggeration: options.exaggeration || 0.3, // Lower for calming effect
      cfgWeight: options.cfgWeight || 0.4, // Lower for slower, more deliberate speech
      outputPath
    };

    console.log(`Synthesizing affirmation: "${text}"`);

    try {
      await this.runChatterbox(synthesisOptions);
      
      // Get audio duration (approximate based on text length and speech rate)
      const estimatedDuration = this.estimateAudioDuration(enhancedText);
      
      const synthesizedAudio: SynthesizedAudio = {
        id: audioId,
        audioPath: outputPath,
        text: text,
        duration: estimatedDuration,
        synthesizedAt: new Date()
      };

      return synthesizedAudio;
    } catch (error) {
      console.error('Failed to synthesize affirmation:', error);
      throw error;
    }
  }

  private estimateAudioDuration(text: string): number {
    // Rough estimation: average speaking rate is about 150 words per minute
    // For calm affirmations, we use a slower rate of about 100 words per minute
    const words = text.split(/\s+/).length;
    const wordsPerSecond = 100 / 60; // 100 words per minute
    return Math.ceil(words / wordsPerSecond);
  }

  private async runChatterbox(options: VoiceSynthesisOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create Python script for Chatterbox TTS
      const pythonScript = `
import sys
sys.path.append('${this.chatterboxPath}')

import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

try:
    # Initialize model
    model = ChatterboxTTS.from_pretrained(device="cuda" if torch.cuda.is_available() else "cpu")
    
    # Generate speech
    text = """${options.text.replace(/"/g, '\\"')}"""
    
    ${options.voicePrompt ? `
    # Use custom voice prompt
    wav = model.generate(
        text, 
        audio_prompt_path="${options.voicePrompt}",
        exaggeration=${options.exaggeration || 0.3},
        cfg_weight=${options.cfgWeight || 0.4}
    )
    ` : `
    # Use default voice
    wav = model.generate(
        text,
        exaggeration=${options.exaggeration || 0.3},
        cfg_weight=${options.cfgWeight || 0.4}
    )
    `}
    
    # Save audio
    ta.save("${options.outputPath}", wav, model.sr)
    print("Synthesis completed successfully")
    
except Exception as e:
    print(f"Error during synthesis: {e}")
    sys.exit(1)
`;

      const scriptPath = path.join(this.outputDir, `synthesis_${Date.now()}.py`);
      
      fs.writeFile(scriptPath, pythonScript)
        .then(() => {
          const synthProcess = spawn('python', [scriptPath], {
            cwd: this.chatterboxPath,
            env: { ...process.env, PYTHONPATH: this.chatterboxPath }
          });

          let stdout = '';
          let stderr = '';

          synthProcess.stdout?.on('data', (data) => {
            stdout += data.toString();
            console.log('Chatterbox:', data.toString().trim());
          });

          synthProcess.stderr?.on('data', (data) => {
            stderr += data.toString();
            console.error('Chatterbox Error:', data.toString().trim());
          });

          synthProcess.on('close', async (code) => {
            // Clean up script file
            try {
              await fs.unlink(scriptPath);
            } catch (e) {
              console.warn('Failed to clean up script file:', e);
            }

            if (code === 0) {
              // Verify output file exists
              try {
                await fs.access(options.outputPath!);
                resolve();
              } catch (e) {
                reject(new Error('Synthesized audio file not found'));
              }
            } else {
              reject(new Error(`Chatterbox process failed with code ${code}: ${stderr}`));
            }
          });

          synthProcess.on('error', (error) => {
            reject(new Error(`Failed to start Chatterbox process: ${error.message}`));
          });
        })
        .catch(reject);
    });
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
        console.log(`Synthesized affirmation ${i + 1}/${affirmations.length}`);
      } catch (error) {
        console.error(`Failed to synthesize affirmation ${i + 1}:`, error);
        // Continue with other affirmations even if one fails
      }
    }

    return synthesizedAudios;
  }

  async createCustomVoicePrompt(audioBuffer: Buffer, outputPath?: string): Promise<string> {
    const voicePromptPath = outputPath || path.join(this.outputDir, `voice_prompt_${uuidv4()}.wav`);
    
    try {
      await fs.writeFile(voicePromptPath, audioBuffer);
      console.log(`Custom voice prompt saved to: ${voicePromptPath}`);
      return voicePromptPath;
    } catch (error) {
      console.error('Failed to save custom voice prompt:', error);
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
export const voiceSynthesisService = new VoiceSynthesisService();

