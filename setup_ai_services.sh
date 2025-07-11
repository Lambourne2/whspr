#!/bin/bash

# Setup script for DiffRhythm and Chatterbox AI services
# This script should be run on the deployment server

set -e

echo "Setting up AI services for Whspr backend..."

# Create directories
sudo mkdir -p /opt/DiffRhythm
sudo mkdir -p /opt/chatterbox
sudo mkdir -p /tmp/generated_music
sudo mkdir -p /tmp/synthesized_voice

# Set permissions
sudo chown -R $USER:$USER /opt/DiffRhythm
sudo chown -R $USER:$USER /opt/chatterbox
sudo chown -R $USER:$USER /tmp/generated_music
sudo chown -R $USER:$USER /tmp/synthesized_voice

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y espeak-ng python3.10 python3.10-venv python3-pip git

# Setup DiffRhythm
echo "Setting up DiffRhythm..."
cd /opt
git clone https://github.com/ASLP-lab/DiffRhythm.git
cd DiffRhythm

# Create Python environment for DiffRhythm
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download model weights (this would need to be updated with actual model URLs)
echo "Note: You'll need to download DiffRhythm model weights manually"
echo "Check the DiffRhythm repository for model download instructions"

# Setup Chatterbox
echo "Setting up Chatterbox..."
cd /opt
git clone https://github.com/resemble-ai/chatterbox.git
cd chatterbox

# Create Python environment for Chatterbox
python3.10 -m venv venv
source venv/bin/activate
pip install -e .

echo "AI services setup complete!"
echo ""
echo "Next steps:"
echo "1. Download DiffRhythm model weights to /opt/DiffRhythm/model/"
echo "2. Test both services manually before running the backend"
echo "3. Set environment variables:"
echo "   - DIFFRHYTHM_PATH=/opt/DiffRhythm"
echo "   - CHATTERBOX_PATH=/opt/chatterbox"
echo "   - MUSIC_OUTPUT_DIR=/tmp/generated_music"
echo "   - VOICE_OUTPUT_DIR=/tmp/synthesized_voice"
echo ""
echo "For development, you can modify the paths in the service files:"
echo "- server/musicGeneration.ts"
echo "- server/voiceSynthesis.ts"

