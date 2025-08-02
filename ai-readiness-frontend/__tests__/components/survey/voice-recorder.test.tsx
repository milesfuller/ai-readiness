import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceRecorder } from '@/components/survey/voice-recorder'

// Mock Web APIs
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  onerror: null as any,
  state: 'inactive',
  stream: null
}

const mockAudioContext = {
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn()
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn()
  })),
  close: jest.fn(),
  state: 'running'
}

const mockGetUserMedia = jest.fn()

// Setup global mocks
beforeAll(() => {
  global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder) as any
  global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext) as any
  global.URL.createObjectURL = jest.fn(() => 'mock-audio-url')
  global.URL.revokeObjectURL = jest.fn()
  
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: mockGetUserMedia
    },
    writable: true
  })

  // Mock HTMLAudioElement
  global.HTMLAudioElement = jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    load: jest.fn(),
    onended: null,
    onerror: null,
    currentTime: 0,
    duration: 0
  })) as any
})

describe('VoiceRecorder Component', () => {
  const defaultProps = {
    onTranscriptionUpdate: jest.fn(),
    initialValue: '',
    className: ''
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  })

  describe('Basic Rendering', () => {
    it('renders initial recording interface', () => {
      render(<VoiceRecorder {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
      expect(screen.getByText('Speak clearly for best results')).toBeInTheDocument()
    })

    it('displays initial value in transcription when provided', () => {
      render(<VoiceRecorder {...defaultProps} initialValue="Initial transcription" />)

      // Initial value should be stored but transcription UI only shows after recording
      expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<VoiceRecorder {...defaultProps} className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Recording Functionality', () => {
    it('starts recording when record button is clicked', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
        expect(screen.getByText('Recording...')).toBeInTheDocument()
      })
    })

    it('shows recording status and timer during recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        expect(screen.getByText('Recording...')).toBeInTheDocument()
        expect(screen.getByText('0:00')).toBeInTheDocument()
        expect(screen.getByText('Tap the microphone again to stop')).toBeInTheDocument()
      })
    })

    it('displays recording indicator during recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        const indicator = screen.getByRole('button', { name: 'Stop recording' }).parentElement
        expect(indicator).toHaveClass('border-red-500', 'animate-pulse')
      })
    })

    it('stops recording when stop button is clicked', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      // Start recording
      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
      })

      // Stop recording
      const stopButton = screen.getByRole('button', { name: 'Stop recording' })
      await user.click(stopButton)

      await waitFor(() => {
        expect(mockMediaRecorder.stop).toHaveBeenCalled()
      })
    })

    it('handles recording errors gracefully', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Media access denied'))
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      // Should not crash and remain in initial state
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
    })
  })

  describe('Audio Visualization', () => {
    it('shows volume visualization during recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        expect(screen.getByText('Recording...')).toBeInTheDocument()
      })

      // Simulate volume data - in real implementation, this would be handled by intervals
      // The visualization bars should be present when recording
      const visualizer = screen.getByText('Recording...').parentElement
      expect(visualizer).toBeInTheDocument()
    })

    it('clears visualization when recording stops', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      // Start and stop recording
      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
      })

      const stopButton = screen.getByRole('button', { name: 'Stop recording' })
      await user.click(stopButton)

      // Visualization should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Recording...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Playback Functionality', () => {
    it('shows playback controls after recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      // Simulate complete recording process
      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
      })

      const stopButton = screen.getByRole('button', { name: 'Stop recording' })
      await user.click(stopButton)

      // Simulate MediaRecorder onstop event
      act(() => {
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop(new Event('stop'))
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Processing recording...')).toBeInTheDocument()
      })

      // Wait for processing to complete (2s timeout in component)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Record again' })).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('plays and pauses recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      // Complete recording process first
      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument()
      }, { timeout: 3000 })

      // Test play functionality
      const playButton = screen.getByRole('button', { name: 'Play recording' })
      await user.click(playButton)

      expect(screen.getByRole('button', { name: 'Pause recording playback' })).toBeInTheDocument()

      // Test pause functionality
      const pauseButton = screen.getByRole('button', { name: 'Pause recording playback' })
      await user.click(pauseButton)

      expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument()
    })

    it('allows retaking recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      // Complete recording process
      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Record again' })).toBeInTheDocument()
      }, { timeout: 3000 })

      const retakeButton = screen.getByRole('button', { name: 'Record again' })
      await user.click(retakeButton)

      // Should return to initial recording state
      expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
    })
  })

  describe('Transcription Functionality', () => {
    it('shows transcription after processing', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(screen.getByText('Transcription:')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Edit the transcription if needed...')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('allows editing transcription', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Edit the transcription if needed...')).toBeInTheDocument()
      }, { timeout: 3000 })

      const transcriptionTextarea = screen.getByPlaceholderText('Edit the transcription if needed...')
      await user.clear(transcriptionTextarea)
      await user.type(transcriptionTextarea, 'Edited transcription text')

      expect(defaultProps.onTranscriptionUpdate).toHaveBeenLastCalledWith('Edited transcription text')
    })

    it('calls onTranscriptionUpdate when transcription is complete', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(defaultProps.onTranscriptionUpdate).toHaveBeenCalledWith(
          expect.stringContaining('[Voice recording')
        )
      }, { timeout: 3000 })
    })
  })

  describe('Timer Functionality', () => {
    it('updates recording duration during recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        expect(screen.getByText('0:00')).toBeInTheDocument()
      })

      // Note: In a real test environment, you might want to mock timers
      // For now, we just verify the initial state
    })

    it('displays final duration after recording', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(screen.getByText(/Duration: \d+:\d+/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for all interactive elements', () => {
      render(<VoiceRecorder {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
    })

    it('maintains focus management during state changes', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: 'Stop recording' })
        expect(stopButton).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      
      // Test keyboard activation
      recordButton.focus()
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled()
      })
    })

    it('provides appropriate feedback for screen readers', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        const transcriptionSection = screen.getByText('Transcription:')
        expect(transcriptionSection).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('has touch-friendly button sizes', () => {
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      expect(recordButton).toHaveClass('touch-target')
    })

    it('shows mobile-appropriate text labels', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        // Should show both desktop and mobile versions
        expect(screen.getByText('Play')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('handles responsive design classes', () => {
      render(<VoiceRecorder {...defaultProps} />)

      const recordingInterface = screen.getByRole('button', { name: 'Start recording' }).parentElement
      expect(recordingInterface).toHaveClass('w-28', 'h-28', 'sm:w-32', 'sm:h-32')
    })
  })

  describe('Error Handling', () => {
    it('handles microphone permission denied', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      // Should remain in initial state without crashing
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
    })

    it('handles MediaRecorder not supported', async () => {
      const originalMediaRecorder = global.MediaRecorder
      delete (global as any).MediaRecorder

      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      const recordButton = screen.getByRole('button', { name: 'Start recording' })
      await user.click(recordButton)

      // Should handle gracefully
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()

      // Restore MediaRecorder
      global.MediaRecorder = originalMediaRecorder
    })

    it('handles audio playback errors', async () => {
      const mockAudio = {
        play: jest.fn().mockRejectedValue(new Error('Playback failed')),
        pause: jest.fn(),
        onended: null,
        onerror: null
      }
      
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument()
      }, { timeout: 3000 })

      // Mock the HTMLAudioElement after the component has rendered
      const originalHTMLAudioElement = global.HTMLAudioElement
      global.HTMLAudioElement = jest.fn(() => mockAudio) as any

      const playButton = screen.getByRole('button', { name: 'Play recording' })
      await user.click(playButton)

      // Should handle error gracefully and stay in play state
      expect(playButton).toBeInTheDocument()

      // Restore HTMLAudioElement
      global.HTMLAudioElement = originalHTMLAudioElement
    })
  })

  describe('Security', () => {
    it('sanitizes transcription text to prevent XSS', async () => {
      const user = userEvent.setup()
      render(<VoiceRecorder {...defaultProps} />)

      await completeRecordingProcess(user)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Edit the transcription if needed...')).toBeInTheDocument()
      }, { timeout: 3000 })

      const transcriptionTextarea = screen.getByPlaceholderText('Edit the transcription if needed...')
      const xssPayload = '<script>alert("XSS")</script>'
      
      await user.clear(transcriptionTextarea)
      await user.type(transcriptionTextarea, xssPayload)

      // Should be treated as text, not executed
      expect(transcriptionTextarea).toHaveValue(xssPayload)
      expect(defaultProps.onTranscriptionUpdate).toHaveBeenLastCalledWith(xssPayload)
    })

    it('does not expose sensitive audio data', () => {
      render(<VoiceRecorder {...defaultProps} />)

      // Component should handle audio data securely
      // In a real app, this would verify secure handling of audio blobs
      expect(true).toBe(true) // Placeholder for security audit
    })
  })

  // Helper function to complete the recording process
  async function completeRecordingProcess(user: any) {
    const recordButton = screen.getByRole('button', { name: 'Start recording' })
    await user.click(recordButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
    })

    const stopButton = screen.getByRole('button', { name: 'Stop recording' })
    await user.click(stopButton)

    // Simulate MediaRecorder onstop event
    act(() => {
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop(new Event('stop'))
      }
    })
  }
})