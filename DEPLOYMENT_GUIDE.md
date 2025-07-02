# Whspr Backend Deployment Guide

This guide covers deploying the enhanced Whspr backend with AI music generation and voice synthesis capabilities.

## Overview

The enhanced backend includes:
- **Infinite Music Streaming**: AI-generated music using DiffRhythm
- **Custom Affirmations**: AI voice synthesis using Chatterbox
- **Streaming Management**: Real-time session handling and buffer management
- **Mock Services**: Development-friendly testing without full AI setup

## Quick Start (Development)

### 1. Clone and Setup
```bash
git clone https://github.com/Lambourne2/whspr.git
cd whspr
npm install
```

### 2. Environment Variables
Create a `.env` file:
```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# Authentication
SESSION_SECRET=your_session_secret
REPL_ID=your_replit_app_id
REPLIT_DOMAINS=your_domain.com
ISSUER_URL=https://replit.com/oidc

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Development mode (uses mock services)
NODE_ENV=development
```

### 3. Database Setup
```bash
npm run db:push
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000` with mock AI services enabled.

## Production Deployment

### Prerequisites

1. **Server Requirements**:
   - Ubuntu 22.04 or similar
   - 16GB+ RAM (for AI models)
   - GPU support (recommended for DiffRhythm and Chatterbox)
   - 50GB+ disk space

2. **Dependencies**:
   - Node.js 20.x
   - Python 3.10
   - PostgreSQL
   - CUDA (for GPU acceleration)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python and dependencies
sudo apt-get install -y python3.10 python3.10-venv python3-pip git espeak-ng

# Install CUDA (optional, for GPU acceleration)
# Follow NVIDIA CUDA installation guide for your system
```

### Step 2: AI Services Setup

```bash
# Clone and setup the project
git clone https://github.com/Lambourne2/whspr.git
cd whspr

# Run AI services setup script
chmod +x setup_ai_services.sh
./setup_ai_services.sh
```

### Step 3: Download AI Models

#### DiffRhythm Models
```bash
cd /opt/DiffRhythm
# Follow the official DiffRhythm repository instructions to download models
# Models should be placed in the model/ directory
```

#### Chatterbox Models
Chatterbox models are downloaded automatically on first use.

### Step 4: Environment Configuration

Create production `.env` file:
```bash
# Production environment
NODE_ENV=production

# Database (use your production PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
SESSION_SECRET=your_secure_session_secret
REPL_ID=your_replit_app_id
REPLIT_DOMAINS=yourdomain.com
ISSUER_URL=https://replit.com/oidc

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# AI Service Paths
DIFFRHYTHM_PATH=/opt/DiffRhythm
CHATTERBOX_PATH=/opt/chatterbox
MUSIC_OUTPUT_DIR=/tmp/generated_music
VOICE_OUTPUT_DIR=/tmp/synthesized_voice

# Audio serving
AUDIO_BASE_URL=https://yourdomain.com/audio
```

### Step 5: Build and Deploy

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm start
```

### Step 6: Process Management

Use PM2 for production process management:

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'whspr-backend',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 7: Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve generated audio files
    location /audio/ {
        alias /tmp/generated_music/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    location /voice/ {
        alias /tmp/synthesized_voice/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

## API Endpoints

### Streaming Control
- `POST /api/stream/start` - Start streaming session
- `POST /api/stream/:sessionId/position` - Update playback position
- `POST /api/stream/:sessionId/stop` - Stop streaming session
- `GET /api/stream/sessions` - Get active sessions

### Audio Streaming
- `GET /api/stream/:sessionId/segment/:index` - Stream music segment
- `GET /api/stream/:sessionId/affirmation/:affirmationId` - Stream affirmation

### Customization
- `POST /api/affirmations/generate` - Generate custom affirmation
- `POST /api/voice/upload` - Upload custom voice prompt

### Existing Endpoints
- `POST /api/generateTags` - Generate mood tags
- `POST /api/generateTrack` - Generate complete track
- `GET /api/tracks` - Get user tracks
- `GET /api/tracks/:id` - Get specific track
- `PUT /api/tracks/:id` - Update track
- `DELETE /api/tracks/:id` - Delete track

## Testing

### Development Testing
```bash
# Start development server
npm run dev

# In another terminal, run tests
node test_streaming.js
```

### Production Testing
```bash
# Test API endpoints
curl -X POST http://yourdomain.com/api/stream/start \
  -H "Content-Type: application/json" \
  -d '{"trackId": 1, "affirmationInterval": 30}'

# Test audio streaming
curl -I http://yourdomain.com/api/stream/SESSION_ID/segment/0
```

## Monitoring

### Health Checks
```bash
# Check service status
pm2 status

# Check logs
pm2 logs whspr-backend

# Monitor resources
pm2 monit
```

### Log Files
- Application logs: PM2 logs
- AI service logs: `/tmp/generated_music/` and `/tmp/synthesized_voice/`
- Nginx logs: `/var/log/nginx/`

### Performance Monitoring
Monitor these metrics:
- Memory usage (AI models are memory-intensive)
- Disk space (generated audio files)
- GPU utilization (if using GPU acceleration)
- Active streaming sessions
- Audio generation time

## Troubleshooting

### Common Issues

1. **AI Services Not Working**
   ```bash
   # Check if models are downloaded
   ls -la /opt/DiffRhythm/model/
   
   # Test DiffRhythm manually
   cd /opt/DiffRhythm
   source venv/bin/activate
   python infer/infer.py --help
   
   # Test Chatterbox manually
   cd /opt/chatterbox
   source venv/bin/activate
   python -c "from chatterbox.tts import ChatterboxTTS; print('OK')"
   ```

2. **Memory Issues**
   ```bash
   # Check memory usage
   free -h
   
   # Restart services to free memory
   pm2 restart whspr-backend
   ```

3. **Disk Space Issues**
   ```bash
   # Check disk usage
   df -h
   
   # Clean up old generated files
   find /tmp/generated_music -type f -mtime +1 -delete
   find /tmp/synthesized_voice -type f -mtime +1 -delete
   ```

4. **Database Connection Issues**
   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check database migrations
   npm run db:push
   ```

### Performance Optimization

1. **GPU Acceleration**
   - Ensure CUDA is properly installed
   - Verify GPU is detected: `nvidia-smi`
   - Monitor GPU usage during generation

2. **Memory Management**
   - Increase swap space if needed
   - Monitor memory usage with `htop`
   - Adjust PM2 memory restart limits

3. **Disk I/O**
   - Use SSD storage for better performance
   - Consider using tmpfs for temporary files
   - Implement proper cleanup schedules

## Security Considerations

1. **Authentication**
   - Use strong session secrets
   - Implement proper CORS policies
   - Validate all user inputs

2. **File Access**
   - Restrict access to generated files
   - Implement user-specific file isolation
   - Regular cleanup of temporary files

3. **Resource Limits**
   - Implement rate limiting
   - Set maximum file sizes
   - Monitor resource usage

## Scaling

### Horizontal Scaling
- Deploy AI services on separate servers
- Use load balancer for multiple backend instances
- Implement shared storage for generated files

### Vertical Scaling
- Increase server resources (RAM, CPU, GPU)
- Optimize AI model parameters
- Implement caching strategies

## Backup and Recovery

1. **Database Backups**
   ```bash
   # Daily database backup
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. **Configuration Backups**
   - Backup `.env` files
   - Backup Nginx configuration
   - Backup PM2 ecosystem files

3. **Recovery Procedures**
   - Document recovery steps
   - Test backup restoration
   - Maintain disaster recovery plan

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Test with mock services first
4. Verify AI model installations
5. Check system resources

The enhanced backend provides a robust foundation for infinite sleep music streaming with AI-generated content and custom affirmations.

