// Test script for streaming functionality
// This script tests the streaming API endpoints without requiring a full frontend

const BASE_URL = 'http://localhost:5000';

// Mock authentication token (in real implementation, this would come from login)
const mockUserId = 'test-user-123';

async function testStreamingAPI() {
  console.log('Testing Whspr Streaming API...\n');

  try {
    // Test 1: Create a test track
    console.log('1. Creating test track...');
    const trackData = {
      title: 'Test Sleep Track',
      description: 'A test track for streaming functionality',
      journalPrompt: 'I feel peaceful and ready for rest',
      duration: 5, // 5 minutes
      trackType: 'sleep'
    };

    // In a real implementation, this would use proper authentication
    // For testing, we'll assume the track exists with ID 1
    const testTrackId = 1;
    console.log(`✓ Using test track ID: ${testTrackId}\n`);

    // Test 2: Start streaming session
    console.log('2. Starting streaming session...');
    const streamResponse = await fetch(`${BASE_URL}/api/stream/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In real implementation, include authentication headers
      },
      body: JSON.stringify({
        trackId: testTrackId,
        affirmationInterval: 30,
        bufferSize: 3,
        segmentDuration: 60
      })
    });

    if (!streamResponse.ok) {
      throw new Error(`Failed to start streaming: ${streamResponse.statusText}`);
    }

    const streamData = await streamResponse.json();
    console.log(`✓ Streaming session started: ${streamData.sessionId}`);
    console.log(`  - Affirmation interval: ${streamData.affirmationInterval}s`);
    console.log(`  - Total duration: ${streamData.totalDuration}s\n`);

    const sessionId = streamData.sessionId;

    // Test 3: Get first music segment
    console.log('3. Testing music segment streaming...');
    const segmentResponse = await fetch(`${BASE_URL}/api/stream/${sessionId}/segment/0`, {
      headers: {
        // In real implementation, include authentication headers
      }
    });

    if (segmentResponse.ok) {
      const contentLength = segmentResponse.headers.get('content-length');
      console.log(`✓ Music segment available (${contentLength} bytes)`);
    } else {
      console.log(`⚠ Music segment not ready yet (${segmentResponse.status})`);
    }

    // Test 4: Update position to trigger affirmation
    console.log('\n4. Testing position update and affirmation trigger...');
    const positionResponse = await fetch(`${BASE_URL}/api/stream/${sessionId}/position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In real implementation, include authentication headers
      },
      body: JSON.stringify({
        position: 30 // 30 seconds to trigger affirmation
      })
    });

    if (positionResponse.ok) {
      console.log('✓ Position updated successfully');
    } else {
      console.log(`⚠ Position update failed: ${positionResponse.statusText}`);
    }

    // Test 5: Get active sessions
    console.log('\n5. Testing session listing...');
    const sessionsResponse = await fetch(`${BASE_URL}/api/stream/sessions`, {
      headers: {
        // In real implementation, include authentication headers
      }
    });

    if (sessionsResponse.ok) {
      const sessions = await sessionsResponse.json();
      console.log(`✓ Found ${sessions.length} active session(s)`);
      sessions.forEach(session => {
        console.log(`  - Session ${session.id}: Track ${session.trackId}`);
      });
    } else {
      console.log(`⚠ Failed to get sessions: ${sessionsResponse.statusText}`);
    }

    // Test 6: Stop streaming session
    console.log('\n6. Stopping streaming session...');
    const stopResponse = await fetch(`${BASE_URL}/api/stream/${sessionId}/stop`, {
      method: 'POST',
      headers: {
        // In real implementation, include authentication headers
      }
    });

    if (stopResponse.ok) {
      console.log('✓ Streaming session stopped successfully');
    } else {
      console.log(`⚠ Failed to stop session: ${stopResponse.statusText}`);
    }

    console.log('\n✅ All streaming tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\nMake sure the server is running with: npm run dev');
  }
}

// Test custom affirmation generation
async function testAffirmationGeneration() {
  console.log('\n\nTesting Affirmation Generation...\n');

  try {
    const affirmationResponse = await fetch(`${BASE_URL}/api/affirmations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In real implementation, include authentication headers
      },
      body: JSON.stringify({
        text: 'I am peaceful and ready for restful sleep'
      })
    });

    if (affirmationResponse.ok) {
      const affirmationData = await affirmationResponse.json();
      console.log('✓ Affirmation generated successfully:');
      console.log(`  - ID: ${affirmationData.id}`);
      console.log(`  - Text: "${affirmationData.text}"`);
      console.log(`  - Duration: ${affirmationData.duration}s`);
      console.log(`  - Audio URL: ${affirmationData.audioUrl}`);
    } else {
      console.log(`⚠ Affirmation generation failed: ${affirmationResponse.statusText}`);
    }

  } catch (error) {
    console.error('❌ Affirmation test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.log('🎵 Whspr Backend Streaming Tests 🎵');
  console.log('=====================================\n');
  
  await testStreamingAPI();
  await testAffirmationGeneration();
  
  console.log('\n📝 Notes:');
  console.log('- These tests use mock services in development mode');
  console.log('- Authentication is bypassed for testing purposes');
  console.log('- In production, proper authentication headers are required');
  console.log('- Audio files are generated as silent WAV files for testing');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/user`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running!');
    console.log('Please start the server with: npm run dev');
    console.log('Then run this test again with: node test_streaming.js');
    process.exit(1);
  }
  
  await runAllTests();
})();

