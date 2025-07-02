# AI Integration for Whspr Sleep Music App

This document describes the integration of DiffRhythm (music generation) and Chatterbox (voice synthesis) into the Whspr backend for infinite streaming sleep music with custom affirmations.

## Overview

The enhanced backend provides:
- **Infinite Music Streaming**: AI-generated music segments that play continuously
- **Custom Affirmations**: Personalized affirmations spoken every 30 seconds using AI voice synthesis
- **Adaptive Generation**: Music and affirmations adapt to user mood tags and preferences
- **Seamless Playback**: Buffer management ensures smooth transitions between segments

## Architecture

### Core Services

1. **MusicGenerationService** (`server/musicGeneration.ts`)
   - Integrates with DiffRhythm for AI music generation
   - Generates music segments based on mood tags and track type
   - Manages audio file output and cleanup

2. **VoiceSynthesisService** (`server/voiceSynthesis.ts`)
   - Integrates with Chatterbox for AI voice synthesis
   - Converts affirmation text to natural speech
   - Supports custom voice prompts for personalization

3. **StreamingService** (`server/streamingService.ts`)
   - Orchestrates infinite streaming sessions
   - Manages timing for affirmation injection (every 30 seconds)
   - Handles buffer management and segment transitions

### API Endpoints

#### Streaming Control
- `POST /api/stream/start` - Start a new streaming session
- `POST /api/stream/:sessionId/position` - Update playback position
- `POST /api/stream/:sessionId/stop` - Stop streaming session
- `GET /api/stream/sessions` - Get user's active sessions

#### Audio Streaming
- `GET /api/stream/:sessionId/segment/:index` - Stream music segment
- `GET /api/stream/:sessionId/affirmation/:affirmationId` - Stream affirmation audio

#### Customization
- `POST /api/affirmations/generate` - Generate custom affirmation
- `POST /api/voice/upload` - Upload custom voice prompt

## Setup Instructions

### 1. Install AI Services

Run the setup script to install DiffRhythm and Chatterbox:

```bash
./setup_ai_services.sh
```

This script will:
- Install system dependencies (espeak-ng, Python 3.10)
- Clone and set up DiffRhythm and Chatterbox repositories
- Create Python virtual environments
- Install required packages

### 2. Download Model Weights

#### DiffRhythm Models
Download the pre-trained DiffRhythm models from the official repository:
```bash
cd /opt/DiffRhythm
# Follow instructions in the DiffRhythm repository to download model weights
```

#### Chatterbox Models
Chatterbox models are downloaded automatically when first used.

### 3. Environment Variables

Set the following environment variables in your deployment:

```bash
# AI Service Paths
DIFFRHYTHM_PATH=/opt/DiffRhythm
CHATTERBOX_PATH=/opt/chatterbox

# Output Directories
MUSIC_OUTPUT_DIR=/tmp/generated_music
VOICE_OUTPUT_DIR=/tmp/synthesized_voice

# Existing variables (keep these)
DATABASE_URL=your_database_url
OPENAI_API_KEY=your_openai_key
SESSION_SECRET=your_session_secret
# ... other existing variables
```

### 4. Install Node.js Dependencies

```bash
cd whspr
npm install
```

### 5. Test the Services

Before running the full backend, test each service individually:

#### Test DiffRhythm
```bash
cd /opt/DiffRhythm
source venv/bin/activate
python infer/infer.py --prompt "Ambient sleep soundscape with soft piano" --duration 30
```

#### Test Chatterbox
```bash
cd /opt/chatterbox
source venv/bin/activate
python -c "
from chatterbox.tts import ChatterboxTTS
import torchaudio as ta
model = ChatterboxTTS.from_pretrained()
wav = model.generate('I am peaceful and calm')
ta.save('test.wav', wav, model.sr)
"
```

## Usage

### Starting a Streaming Session

```javascript
// Frontend code example
const response = await fetch('/api/stream/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trackId: 123,
    affirmationInterval: 30, // seconds
    bufferSize: 3, // number of segments to buffer
    segmentDuration: 60 // seconds per segment
  })
});

const { sessionId, affirmationInterval, totalDuration } = await response.json();
```

### Streaming Audio

```javascript
// Stream music segments
const audioElement = new Audio(`/api/stream/${sessionId}/segment/0`);
audioElement.play();

// Listen for affirmation events (implement WebSocket or polling)
// When affirmation is triggered, play it over the music
const affirmationAudio = new Audio(`/api/stream/${sessionId}/affirmation/${affirmationId}`);
```

### Updating Position

```javascript
// Update position every second to trigger affirmations
setInterval(async () => {
  const currentTime = audioElement.currentTime;
  await fetch(`/api/stream/${sessionId}/position`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position: currentTime })
  });
}, 1000);
```

## Music Generation

### Prompt Generation

The system generates music prompts based on:
- **Track Type**: Sleep vs. Meditation
- **Mood Tags**: Extracted from user journal entries
- **User Preferences**: Stored in user profile

Example prompts:
- Sleep: "Ambient sleep soundscape with soft piano and gentle rain, deeply calming and grounding"
- Meditation: "Mindful meditation soundscape with singing bowls and gentle drones, anxiety-reducing and centering"

### Segment Management

- **Buffer Size**: Maintains 3 segments ahead of current playback
- **Segment Duration**: Default 60 seconds, configurable
- **Crossfading**: Smooth transitions between segments
- **Cleanup**: Automatic removal of old segments to prevent disk buildup

## Voice Synthesis

### Affirmation Enhancement

Affirmations are enhanced for better TTS delivery:
- Added breathing cues: "Take a gentle breath..."
- Extended pauses: Periods become "... "
- Calming conclusion: "Let this truth settle into your heart."

### Voice Customization

Users can upload custom voice prompts:
```javascript
const formData = new FormData();
formData.append('audioData', base64AudioData);

const response = await fetch('/api/voice/upload', {
  method: 'POST',
  body: formData
});
```

### Synthesis Parameters

- **Exaggeration**: 0.3 (lower for calming effect)
- **CFG Weight**: 0.4 (slower, more deliberate speech)
- **Sample Rate**: 44.1kHz for high quality

## Performance Considerations

### Resource Management

- **GPU Memory**: Both DiffRhythm and Chatterbox can use GPU acceleration
- **CPU Usage**: Audio processing and streaming
- **Disk Space**: Automatic cleanup of generated files after 1 hour
- **Memory**: Buffer management prevents memory leaks

### Scaling

- **Horizontal Scaling**: Services can run on separate servers
- **Load Balancing**: Multiple instances for high concurrency
- **Caching**: Pre-generate popular combinations
- **CDN**: Serve generated audio files from CDN

### Error Handling

- **Graceful Degradation**: Fallback to pre-recorded content if AI services fail
- **Retry Logic**: Automatic retry for transient failures
- **Monitoring**: Comprehensive logging and error tracking
- **Health Checks**: Regular service availability checks

## Troubleshooting

### Common Issues

1. **DiffRhythm not generating music**
   - Check model weights are downloaded
   - Verify Python environment and dependencies
   - Check GPU/CUDA availability

2. **Chatterbox synthesis failing**
   - Ensure PyTorch is properly installed
   - Check audio output directory permissions
   - Verify text input is properly formatted

3. **Streaming interruptions**
   - Check buffer size configuration
   - Monitor disk space for output directories
   - Verify network connectivity for segment requests

### Logs

Check logs in:
- Node.js console output
- `/tmp/generated_music/` for music generation logs
- `/tmp/synthesized_voice/` for voice synthesis logs

### Performance Monitoring

Monitor:
- Generation time per segment
- Memory usage during streaming
- Disk space in output directories
- Active streaming sessions count

## Development

### Local Development

For local development without full AI setup:

1. Set mock mode in service files:
```typescript
// In musicGeneration.ts and voiceSynthesis.ts
const MOCK_MODE = process.env.NODE_ENV === 'development';
```

2. Use pre-recorded audio files for testing
3. Implement service stubs that return mock data

### Testing

Run tests for individual services:
```bash
npm test -- --grep "MusicGenerationService"
npm test -- --grep "VoiceSynthesisService"
npm test -- --grep "StreamingService"
```

### Contributing

When adding new features:
1. Update service interfaces
2. Add comprehensive error handling
3. Include performance monitoring
4. Update documentation
5. Add tests for new functionality

## Security Considerations

- **File Access**: Generated files are user-specific and access-controlled
- **Resource Limits**: Prevent abuse with rate limiting and quotas
- **Input Validation**: Sanitize all user inputs for AI services
- **Cleanup**: Automatic cleanup prevents disk space attacks

## Future Enhancements

- **Real-time Voice Cloning**: Clone user's voice for personalized affirmations
- **Adaptive Music**: Adjust music based on biometric feedback
- **Collaborative Filtering**: Recommend music styles based on similar users
- **Advanced Mixing**: Dynamic volume adjustment and audio effects
- **Multi-language Support**: Affirmations in multiple languages

