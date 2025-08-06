import { test, expect, Page } from '@playwright/test';

/**
 * VOICE RECORDING E2E TESTS
 * 
 * Test Coordination ID: survey-testing-002
 * 
 * COMPREHENSIVE VOICE FUNCTIONALITY TESTING:
 * 1. Voice recording interface and controls
 * 2. MediaRecorder API integration and mocking
 * 3. Audio visualization during recording
 * 4. Transcription processing simulation
 * 5. Playback functionality and controls  
 * 6. Voice-to-text editing capabilities
 * 7. Accessibility compliance for voice features
 * 8. Error handling for unsupported browsers
 * 9. Permission handling for microphone access
 * 10. Mobile touch interactions for voice controls
 */

test.describe('Voice Recording Functionality Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    console.log('🎤 VOICE TESTER: Setting up voice recording test environment...');
    
    const context = await browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Mock MediaRecorder API for testing
    await page.addInitScript(() => {
      // Mock MediaRecorder
      class MockMediaRecorder extends EventTarget {
        state = 'inactive';
        ondataavailable: ((event: any) => void) | null = null;
        onstop: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        
        constructor(stream: MediaStream, options?: any) {
          super();
          console.log('MockMediaRecorder created');
        }
        
        start(timeslice?: number) {
          console.log('MockMediaRecorder: start()');
          this.state = 'recording';
          
          // Simulate data available event
          setTimeout(() => {
            const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
            const event = { data: mockBlob };
            if (this.ondataavailable) {
              this.ondataavailable(event);
            }
          }, 100);
        }
        
        stop() {
          console.log('MockMediaRecorder: stop()');
          this.state = 'inactive';
          
          setTimeout(() => {
            if (this.onstop) {
              this.onstop(new Event('stop'));
            }
          }, 100);
        }
        
        pause() {
          this.state = 'paused';
        }
        
        resume() {
          this.state = 'recording';
        }
      }
      
      // Mock AudioContext
      class MockAudioContext {
        state = 'running';
        
        createAnalyser() {
          return {
            connect: () => {},
            fftSize: 256,
            frequencyBinCount: 128,
            getByteFrequencyData: (dataArray: Uint8Array) => {
              // Fill with random data to simulate audio levels
              for (let i = 0; i < dataArray.length; i++) {
                dataArray[i] = Math.random() * 255;
              }
            }
          };
        }
        
        createMediaStreamSource(stream: MediaStream) {
          return {
            connect: () => {}
          };
        }
        
        close() {
          this.state = 'closed';
        }
      }
      
      // Mock getUserMedia
      const mockGetUserMedia = () => {
        return Promise.resolve({
          getTracks: () => [{
            stop: () => console.log('Track stopped')
          }]
        } as MediaStream);
      };
      
      // Mock HTMLAudioElement
      class MockAudio {
        currentTime = 0;
        duration = 10; // 10 seconds
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        
        constructor(src?: string) {
          console.log('MockAudio created with src:', src);
        }
        
        play() {
          console.log('MockAudio: play()');
          return Promise.resolve();
        }
        
        pause() {
          console.log('MockAudio: pause()');
        }
        
        load() {
          console.log('MockAudio: load()');
        }
      }
      
      // Replace global objects
      (window as any).MediaRecorder = MockMediaRecorder;
      (window as any).AudioContext = MockAudioContext;
      (window as any).webkitAudioContext = MockAudioContext;
      (window as any).Audio = MockAudio;
      window.HTMLAudioElement = MockAudio as any;
      
      // Mock navigator.mediaDevices
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true
      });
      
      // Mock URL.createObjectURL
      window.URL.createObjectURL = (blob: Blob) => {
        return 'blob:mock-audio-url-' + Math.random();
      };
      
      window.URL.revokeObjectURL = (url: string) => {
        console.log('URL revoked:', url);
      };
    });
    
    // Navigate to survey page
    const sessionId = `voice-test-${Date.now()}`;
    await page.goto(`/survey/${sessionId}`);
    await page.waitForSelector('[data-testid="survey-question"]');
  });

  test.describe('Voice Recording Interface', () => {
    
    test('should display voice input option and switch to voice mode', async () => {
      console.log('🎤 TEST: Voice input interface display...');
      
      // Verify voice input toggle is available
      const voiceButton = page.locator('button:has-text("Voice")').first();
      await expect(voiceButton).toBeVisible();
      
      // Switch to voice input mode
      await voiceButton.click();
      
      // Verify voice recording interface appears
      await expect(page.locator('text=Tap to start recording')).toBeVisible();
      await expect(page.locator('button[aria-label="Start recording"]')).toBeVisible();
      await expect(page.locator('text=Speak clearly for best results')).toBeVisible();
      
      // Verify text input is hidden
      await expect(page.locator('textarea')).toBeHidden();
      
      console.log('✅ Voice input interface displayed correctly');
    });

    test('should show recording status and timer during recording', async () => {
      console.log('⏱️ TEST: Recording status and timer...');
      
      // Switch to voice mode
      await page.locator('button:has-text("Voice")').first().click();
      
      // Start recording
      const recordButton = page.locator('button[aria-label="Start recording"]');
      await recordButton.click();
      
      // Verify recording status
      await expect(page.locator('text=Recording')).toBeVisible();
      await expect(page.locator('button[aria-label="Stop recording"]')).toBeVisible();
      
      // Verify timer appears
      await expect(page.locator('text=/⏱️ 0:\d+/')).toBeVisible();
      
      // Verify instruction text updates
      await expect(page.locator('text=Tap the microphone again to stop')).toBeVisible();
      
      console.log('✅ Recording status and timer working correctly');
    });

    test('should display audio visualization during recording', async () => {
      console.log('📊 TEST: Audio visualization during recording...');
      
      // Switch to voice mode and start recording
      await page.locator('button:has-text("Voice")').first().click();
      await page.locator('button[aria-label="Start recording"]').click();
      
      // Wait for visualization to appear
      await page.waitForTimeout(1000);
      
      // Look for volume visualization bars
      const visualizationContainer = page.locator('.flex.items-end.justify-center');
      await expect(visualizationContainer).toBeVisible();
      
      // Check for individual visualization bars
      const visualizationBars = page.locator('.rounded-t-sm');
      const barCount = await visualizationBars.count();
      expect(barCount).toBeGreaterThan(0);
      
      console.log(`✅ Audio visualization showing ${barCount} bars`);
    });

    test('should handle recording stop and show playback interface', async () => {
      console.log('⏹️ TEST: Stop recording and playback interface...');
      
      // Switch to voice mode and start recording
      await page.locator('button:has-text("Voice")').first().click();
      await page.locator('button[aria-label="Start recording"]').click();
      
      // Wait a moment then stop recording
      await page.waitForTimeout(1000);
      await page.locator('button[aria-label="Stop recording"]').click();
      
      // Should show processing state
      await expect(page.locator('text=Processing recording')).toBeVisible();
      await expect(page.locator('text=Converting speech to text with AI magic')).toBeVisible();
      
      // Wait for processing to complete (2s in component)
      await page.waitForTimeout(3000);
      
      // Should show playback controls
      await expect(page.locator('button:has-text("Play Recording")').or(page.locator('button:has-text("Play")'))).toBeVisible();
      await expect(page.locator('button:has-text("Retake")').or(page.locator('button:has-text("Record again")'))).toBeVisible();
      
      // Should show duration info
      await expect(page.locator('text=/Duration: \d+:\d+/')).toBeVisible();
      
      console.log('✅ Playback interface displayed correctly');
    });
  });

  test.describe('Audio Playback Controls', () => {
    
    test('should play and pause recorded audio', async () => {
      console.log('▶️ TEST: Audio playback controls...');
      
      // Complete recording first
      await completeVoiceRecording(page);
      
      // Test play functionality
      const playButton = page.locator('button:has-text("Play")').first();
      await playButton.click();
      
      // Should switch to pause button
      await expect(page.locator('button:has-text("Pause")').first()).toBeVisible();
      
      // Test pause functionality
      await page.locator('button:has-text("Pause")').first().click();
      
      // Should switch back to play button
      await expect(playButton).toBeVisible();
      
      console.log('✅ Audio playback controls working correctly');
    });

    test('should allow retaking recording', async () => {
      console.log('🔄 TEST: Retake recording functionality...');
      
      // Complete recording first
      await completeVoiceRecording(page);
      
      // Click retake button
      const retakeButton = page.locator('button:has-text("Retake")');
      await retakeButton.click();
      
      // Should return to initial recording state
      await expect(page.locator('text=Tap to start recording')).toBeVisible();
      await expect(page.locator('button[aria-label="Start recording"]')).toBeVisible();
      
      // Previous recording elements should be gone
      await expect(page.locator('button:has-text("Play")').first()).toBeHidden();
      await expect(page.locator('text=/Duration:/')).toBeHidden();
      
      console.log('✅ Retake functionality working correctly');
    });

    test('should show recording duration information', async () => {
      console.log('📏 TEST: Recording duration display...');
      
      // Complete recording
      await completeVoiceRecording(page);
      
      // Verify duration is displayed
      const durationText = page.locator('text=/Duration: \d+:\d+/');
      await expect(durationText).toBeVisible();
      
      // Extract and verify duration format
      const durationContent = await durationText.textContent();
      expect(durationContent).toMatch(/Duration: \d+:\d+/);
      
      console.log(`✅ Duration displayed: ${durationContent}`);
    });
  });

  test.describe('Transcription Functionality', () => {
    
    test('should show transcription after processing', async () => {
      console.log('📝 TEST: Transcription display...');
      
      // Complete recording and wait for transcription
      await completeVoiceRecording(page);
      
      // Verify transcription section appears
      await expect(page.locator('text=Transcription')).toBeVisible();
      await expect(page.locator('textarea[placeholder*="Edit the transcription"]')).toBeVisible();
      
      // Verify default transcription content (mock)
      const transcriptionTextarea = page.locator('textarea[placeholder*="Edit the transcription"]');
      const transcriptionValue = await transcriptionTextarea.inputValue();
      expect(transcriptionValue).toContain('[Voice recording');
      
      console.log('✅ Transcription displayed correctly');
    });

    test('should allow editing transcription text', async () => {
      console.log('✏️ TEST: Transcription editing...');
      
      // Complete recording
      await completeVoiceRecording(page);
      
      // Find and edit transcription
      const transcriptionTextarea = page.locator('textarea[placeholder*="Edit the transcription"]');
      
      const editedText = 'This is my edited transcription text for testing purposes.';
      await transcriptionTextarea.clear();
      await transcriptionTextarea.fill(editedText);
      
      // Verify text was updated
      const updatedValue = await transcriptionTextarea.inputValue();
      expect(updatedValue).toBe(editedText);
      
      console.log('✅ Transcription editing working correctly');
    });

    test('should display transcription editing instructions', async () => {
      console.log('📋 TEST: Transcription editing instructions...');
      
      // Complete recording
      await completeVoiceRecording(page);
      
      // Verify instruction text
      await expect(page.locator('text=You can edit the transcription above')).toBeVisible();
      
      // Verify placeholder text
      const transcriptionTextarea = page.locator('textarea[placeholder*="Edit the transcription"]');
      await expect(transcriptionTextarea).toHaveAttribute('placeholder', 'Edit the transcription if needed...');
      
      console.log('✅ Transcription instructions displayed correctly');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    
    test('should handle microphone permission denied', async () => {
      console.log('🚫 TEST: Microphone permission denied...');
      
      // Create new context without microphone permission
      const context = await page.context().browser()!.newContext({
        permissions: [] // No microphone permission
      });
      
      const newPage = await context.newPage();
      
      // Mock getUserMedia to reject
      await newPage.addInitScript(() => {
        Object.defineProperty(navigator, 'mediaDevices', {
          value: {
            getUserMedia: () => Promise.reject(new Error('Permission denied'))
          },
          writable: true
        });
      });
      
      const sessionId = `permission-test-${Date.now()}`;
      await newPage.goto(`/survey/${sessionId}`);
      await newPage.waitForSelector('[data-testid="survey-question"]');
      
      // Switch to voice mode and try to record
      await newPage.locator('button:has-text("Voice")').first().click();
      await newPage.locator('button[aria-label="Start recording"]').click();
      
      // Should remain in initial state without crashing
      await expect(newPage.locator('text=Tap to start recording')).toBeVisible();
      
      await context.close();
      console.log('✅ Microphone permission denial handled gracefully');
    });

    test('should handle MediaRecorder not supported', async () => {
      console.log('❌ TEST: MediaRecorder not supported...');
      
      // Create page without MediaRecorder support
      const context = await page.context().browser()!.newContext();
      const newPage = await context.newPage();
      
      // Remove MediaRecorder from global scope
      await newPage.addInitScript(() => {
        delete (window as any).MediaRecorder;
      });
      
      const sessionId = `no-mediarecorder-${Date.now()}`;
      await newPage.goto(`/survey/${sessionId}`);
      await newPage.waitForSelector('[data-testid="survey-question"]');
      
      // Voice option should still be available (graceful degradation)
      await newPage.locator('button:has-text("Voice")').first().click();
      
      // Should handle missing MediaRecorder gracefully
      await newPage.locator('button[aria-label="Start recording"]').click();
      
      // Should remain stable without crashing
      await expect(newPage.locator('text=Tap to start recording')).toBeVisible();
      
      await context.close();
      console.log('✅ Missing MediaRecorder handled gracefully');
    });

    test('should provide fallback to text input', async () => {
      console.log('📝 TEST: Fallback to text input...');
      
      // Switch to voice mode
      await page.locator('button:has-text("Voice")').first().click();
      
      // Should be able to switch back to text mode
      await page.locator('button:has-text("Text")').first().click();
      
      // Text input should be available
      await expect(page.locator('textarea')).toBeVisible();
      
      // Should be able to type answer
      await page.locator('textarea').fill('This is a fallback text answer');
      
      // Verify text is entered correctly
      const textValue = await page.locator('textarea').inputValue();
      expect(textValue).toBe('This is a fallback text answer');
      
      console.log('✅ Fallback to text input working correctly');
    });
  });

  test.describe('Accessibility and Mobile Support', () => {
    
    test('should have proper ARIA labels for voice controls', async () => {
      console.log('♿ TEST: Voice controls accessibility...');
      
      // Switch to voice mode
      await page.locator('button:has-text("Voice")').first().click();
      
      // Verify ARIA labels
      await expect(page.locator('button[aria-label="Start recording"]')).toBeVisible();
      
      // Start recording and verify stop button
      await page.locator('button[aria-label="Start recording"]').click();
      await expect(page.locator('button[aria-label="Stop recording"]')).toBeVisible();
      
      // Stop recording and check playback controls
      await page.locator('button[aria-label="Stop recording"]').click();
      await page.waitForTimeout(3000);
      
      // Verify playback control labels
      await expect(page.locator('button[aria-label*="Play recording"], button[aria-label*="Play"]')).toBeVisible();
      await expect(page.locator('button[aria-label*="Record again"], button[aria-label*="Retake"]')).toBeVisible();
      
      console.log('✅ Voice controls have proper ARIA labels');
    });

    test('should support keyboard navigation for voice controls', async () => {
      console.log('⌨️ TEST: Keyboard navigation for voice controls...');
      
      // Switch to voice mode
      await page.locator('button:has-text("Voice")').first().click();
      
      // Focus on record button
      const recordButton = page.locator('button[aria-label="Start recording"]');
      await recordButton.focus();
      
      // Should be focusable
      await expect(recordButton).toBeFocused();
      
      // Should activate with Enter key
      await page.keyboard.press('Enter');
      
      // Should start recording
      await expect(page.locator('button[aria-label="Stop recording"]')).toBeVisible();
      
      console.log('✅ Keyboard navigation working for voice controls');
    });

    test('should have touch-friendly button sizes', async () => {
      console.log('📱 TEST: Touch-friendly voice controls...');
      
      // Switch to voice mode
      await page.locator('button:has-text("Voice")').first().click();
      
      // Verify record button has touch-target class
      const recordButton = page.locator('button[aria-label="Start recording"]');
      await expect(recordButton).toHaveClass(/touch-target/);
      
      // Start recording and check stop button
      await recordButton.click();
      const stopButton = page.locator('button[aria-label="Stop recording"]');
      await expect(stopButton).toHaveClass(/touch-target/);
      
      // Stop and check playback controls
      await stopButton.click();
      await page.waitForTimeout(3000);
      
      const playButton = page.locator('button:has-text("Play")').first();
      await expect(playButton).toHaveClass(/touch-target/);
      
      console.log('✅ Voice controls are touch-friendly');
    });
  });
});

/**
 * HELPER FUNCTIONS
 */

async function completeVoiceRecording(page: Page): Promise<void> {
  console.log('🎤 Helper: Completing voice recording...');
  
  // Switch to voice mode if not already
  const voiceButton = page.locator('button:has-text("Voice")').first();
  if (await voiceButton.isVisible()) {
    await voiceButton.click();
  }
  
  // Start recording
  await page.locator('button[aria-label="Start recording"]').click();
  
  // Wait a moment for recording
  await page.waitForTimeout(1000);
  
  // Stop recording
  await page.locator('button[aria-label="Stop recording"]').click();
  
  // Wait for processing to complete
  await page.waitForTimeout(3000);
  
  console.log('✅ Voice recording completed');
}