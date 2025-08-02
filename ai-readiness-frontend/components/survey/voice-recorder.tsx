'use client'

import React, { useState, useRef, useCallback } from 'react'
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
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
    }
  }, [recordingDuration, onTranscriptionUpdate])

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
          volumes.push((sum / (end - start)) / 255)
        }
        
        setAudioVolume(volumes)
      }
    }, 100)
  }, [])

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
    <div className={`space-y-6 ${className}`}>
      {/* Recording Interface */}
      <div className="text-center space-y-4">
        {!audioBlob ? (
          <div className="space-y-4">
            {/* Recording Button */}
            <div className={`w-32 h-32 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-300 relative ${
              isRecording 
                ? 'border-red-500 bg-red-500/10 animate-pulse' 
                : 'border-teal-500 bg-teal-500/10 hover:bg-teal-500/20'
            }`}>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className="w-full h-full rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                disabled={isProcessing}
              >
                {isRecording ? (
                  <MicOff className="h-12 w-12 text-red-500 mx-auto" />
                ) : (
                  <Mic className="h-12 w-12 text-teal-500 mx-auto" />
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
                    className="bg-teal-500 rounded-t-sm transition-all duration-100"
                    style={{
                      height: `${Math.max(2, volume * 48)}px`,
                      width: '4px'
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Recording Status */}
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isRecording ? 'Recording...' : 'Click to start recording'}
              </p>
              {isRecording && (
                <p className="text-teal-400 font-mono">
                  {formatDuration(recordingDuration)}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {isRecording 
                  ? 'Click the microphone again to stop' 
                  : 'Speak clearly for best results'
                }
              </p>
            </div>
          </div>
        ) : (
          /* Playback Interface */
          <div className="space-y-4">
            {/* Processing State */}
            {isProcessing && (
              <div className="flex items-center justify-center space-x-2 text-teal-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing recording...</span>
              </div>
            )}
            
            {/* Playback Controls */}
            {!isProcessing && (
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={isPlaying ? pauseRecording : playRecording}
                  className="flex items-center space-x-2"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  <span>{isPlaying ? 'Pause' : 'Play'} Recording</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={retakeRecording}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-5 w-5" />
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
        <Card className="p-4 border-teal-500/20 bg-teal-950/10">
          <div className="space-y-3">
            <div className="text-sm font-medium text-teal-400 flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <span>Transcription:</span>
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
              You can edit the transcription above to ensure accuracy.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default VoiceRecorder