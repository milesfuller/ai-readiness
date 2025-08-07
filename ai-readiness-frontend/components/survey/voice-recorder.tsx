'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  RotateCcw,
  Volume2,
  Loader2
} from 'lucide-react'

interface VoiceRecorderProps {
  onTranscriptionUpdate: (transcription: string) => void
  initialValue?: string
  className?: string
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptionUpdate,
  initialValue = '',
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState(initialValue)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioVolume, setAudioVolume] = useState<number[]>([])
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [showManualButton, setShowManualButton] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Check permission status on component mount
  useEffect(() => {
    const checkPermissionStatus = async () => {
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          setPermissionState(permissionStatus.state as any)
          
          if (permissionStatus.state === 'denied') {
            setShowManualButton(true)
          }
        } catch (error) {
          console.log('Permission query not supported:', error)
          setPermissionState('unknown')
        }
      }
    }
    
    checkPermissionStatus()
  }, [])

  // Define startVolumeVisualization before startRecording to avoid scope issues
  const startVolumeVisualization = useCallback(() => {
    if (!analyserRef.current) return
    
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    volumeIntervalRef.current = setInterval(() => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Calculate volume levels for visualization
        const volumes = []
        for (let i = 0; i < 12; i++) {
          const start = Math.floor((i * bufferLength) / 12)
          const end = Math.floor(((i + 1) * bufferLength) / 12)
          let sum = 0
          for (let j = start; j < end; j++) {
            sum += dataArray[j]
          }
          volumes.push(Math.min(100, (sum / (end - start)) * 0.8))
        }
        setAudioVolume(volumes)
      }
    }, 100)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      // Check if microphone is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported by this browser')
      }

      // Check if we're on HTTPS or localhost
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      if (!isSecure) {
        throw new Error('Microphone access requires HTTPS. Please access this site over HTTPS.')
      }

      // Check current permission status
      if (permissionState === 'denied') {
        setShowManualButton(true)
        throw new Error('Microphone access was denied. Please click the "Allow Microphone" button below to grant permission.')
      }

      console.log('Requesting microphone access...')
      // Request microphone permission with explicit user gesture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('Microphone access granted, stream:', stream)
      
      streamRef.current = stream
      
      // Set up audio visualization
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setIsProcessing(true)
        
        // Mock transcription - in real app, send to transcription service
        setTimeout(() => {
          const mockTranscription = `[Voice recording ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}]`
          setTranscription(mockTranscription)
          onTranscriptionUpdate(mockTranscription)
          setIsProcessing(false)
        }, 2000)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingDuration(0)
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
      
      // Start volume visualization
      startVolumeVisualization()
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionState('denied')
          setShowManualButton(true)
          alert('Microphone access denied. Please click the "Allow Microphone" button below or check your browser settings.')
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.')
        } else if (error.name === 'NotSupportedError') {
          alert('Voice recording is not supported by this browser. Please try using Chrome, Firefox, or Safari.')
        } else {
          alert('Failed to start voice recording. Please check your microphone settings and try again.')
        }
      }
    }
  }, [recordingDuration, onTranscriptionUpdate, startVolumeVisualization, permissionState])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      // Clear intervals
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current)
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      
      setIsRecording(false)
      setAudioVolume([])
    }
  }, [isRecording])

  const playRecording = useCallback(() => {
    if (audioBlob && !isPlaying) {
      const audio = new Audio(URL.createObjectURL(audioBlob))
      audioRef.current = audio
      
      audio.play()
      setIsPlaying(true)
      
      audio.onended = () => {
        setIsPlaying(false)
      }
      
      audio.onerror = () => {
        setIsPlaying(false)
      }
    }
  }, [audioBlob, isPlaying])

  const pauseRecording = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [isPlaying])

  const retakeRecording = useCallback(() => {
    setAudioBlob(null)
    setTranscription('')
    setRecordingDuration(0)
    setAudioVolume([])
    onTranscriptionUpdate('')
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
  }, [onTranscriptionUpdate])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Recording Interface */}
      <div className="text-center space-y-4">
        {!audioBlob ? (
          <div className="space-y-4">
            {/* Recording Button */}
            <div className={`w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-300 relative whimsy-hover ${
              isRecording 
                ? 'border-red-500 bg-red-500/10 voice-recording-pulse' 
                : 'border-teal-500 bg-teal-500/10 hover:bg-teal-500/20 hover:scale-105'
            }`}>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className="w-full h-full rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 touch-target"
                disabled={isProcessing}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? (
                  <MicOff className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto" />
                ) : (
                  <Mic className="h-10 w-10 sm:h-12 sm:w-12 text-teal-500 mx-auto" />
                )}
              </button>
              
              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              )}
            </div>
            
            {/* Volume Visualization */}
            {isRecording && audioVolume.length > 0 && (
              <div className="flex items-end justify-center space-x-1 h-12">
                {audioVolume.map((volume, index) => (
                  <div
                    key={index}
                    className={`rounded-t-sm transition-all duration-100 ${
                      volume > 0.6 ? 'bg-red-400' : 
                      volume > 0.3 ? 'bg-yellow-400' : 'bg-teal-500'
                    }`}
                    style={{
                      height: `${Math.max(2, volume * 48)}px`,
                      width: '4px',
                      boxShadow: volume > 0.5 ? '0 0 8px currentColor' : 'none'
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Recording Status */}
            <div className="space-y-2">
              <p className={`text-base sm:text-lg font-medium transition-all duration-300 ${
                isRecording ? 'animate-pulse text-red-400' : ''
              }`}>
                {isRecording ? '🎙️ Recording...' : '🎤 Tap to start recording'}
              </p>
              {isRecording && (
                <p className="text-teal-400 font-mono text-lg sm:text-xl animate-pulse">
                  ⏱️ {formatDuration(recordingDuration)}
                </p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground px-4">
                {isRecording 
                  ? '✋ Tap the microphone again to stop' 
                  : permissionState === 'denied'
                  ? '🔒 Microphone access denied - use button below'
                  : '💡 Speak clearly for best results'
                }
              </p>
              
              {/* Manual Permission Button */}
              {showManualButton && !isRecording && (
                <div className="mt-4 p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-amber-400">
                      🎤 Microphone permission is required for voice recording
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          console.log('Requesting microphone permission...')
                          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                          stream.getTracks().forEach(track => track.stop())
                          setPermissionState('granted')
                          setShowManualButton(false)
                          alert('Permission granted! You can now start recording.')
                        } catch (error: any) {
                          console.error('Permission request failed:', error)
                          if (error.name === 'NotAllowedError') {
                            alert('Please allow microphone access in your browser settings.')
                          }
                        }
                      }}
                      variant="outline"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                    >
                      🔓 Allow Microphone Access
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Click to request microphone permissions from your browser
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Playback Interface */
          <div className="space-y-4">
            {/* Processing State */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center space-y-3 text-teal-400">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>🧠 Processing recording...</span>
                </div>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p className="text-xs text-muted-foreground animate-pulse">
                  ✨ Converting speech to text with AI magic
                </p>
              </div>
            )}
            
            {/* Playback Controls */}
            {!isProcessing && (
              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                <Button
                  variant="outline"
                  size="default"
                  onClick={isPlaying ? pauseRecording : playRecording}
                  className="flex items-center space-x-2 touch-target"
                  aria-label={isPlaying ? 'Pause recording playback' : 'Play recording'}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'} Recording</span>
                  <span className="sm:hidden">{isPlaying ? 'Pause' : 'Play'}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="default"
                  onClick={retakeRecording}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground touch-target"
                  aria-label="Record again"
                >
                  <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Retake</span>
                </Button>
              </div>
            )}
            
            {/* Recording Info */}
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Volume2 className="h-4 w-4" />
                <span>Duration: {formatDuration(recordingDuration)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Editor */}
      {transcription && !isProcessing && (
        <Card className="p-4 border-teal-500/20 bg-teal-950/10 animate-in slide-in-from-bottom duration-500">
          <div className="space-y-3">
            <div className="text-sm font-medium text-teal-400 flex items-center space-x-2">
              <Mic className="h-4 w-4 animate-pulse" />
              <span>📝 Transcription:</span>
            </div>
            
            <Textarea
              value={transcription}
              onChange={(e) => {
                setTranscription(e.target.value)
                onTranscriptionUpdate(e.target.value)
              }}
              placeholder="Edit the transcription if needed..."
              className="min-h-[100px] bg-background/50 border-teal-500/30 focus:border-teal-500"
              rows={4}
            />
            
            <p className="text-xs text-muted-foreground">
              ✏️ You can edit the transcription above to ensure accuracy.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default VoiceRecorder