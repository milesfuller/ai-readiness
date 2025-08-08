'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Save, X, Volume2, VolumeX, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
  isEditing?: boolean;
}

interface TranscriptionDisplayProps {
  segments: TranscriptionSegment[];
  isRealTime?: boolean;
  isLoading?: boolean;
  onSegmentEdit?: (segmentId: string, newText: string) => void;
  onExport?: (format: 'txt' | 'srt' | 'vtt') => void;
  audioUrl?: string;
  className?: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  segments,
  isRealTime = false,
  isLoading = false,
  onSegmentEdit,
  onExport,
  audioUrl,
  className = ''
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [showConfidenceScores, setShowConfidenceScores] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        
        // Highlight current segment
        const currentSegment = segments.find(seg => 
          audio.currentTime >= seg.startTime && audio.currentTime <= seg.endTime
        );
        
        if (currentSegment && currentSegment.id !== selectedSegment) {
          setSelectedSegment(currentSegment.id);
          
          // Scroll to current segment
          const segmentElement = segmentRefs.current[currentSegment.id];
          if (segmentElement && containerRef.current) {
            segmentElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center'
            });
          }
        }
      };
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      };
    }
    return undefined;
  }, [segments, selectedSegment]);

  const handleEditStart = (segment: TranscriptionSegment) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text);
  };

  const handleEditSave = () => {
    if (editingSegmentId && onSegmentEdit) {
      onSegmentEdit(editingSegmentId, editText);
    }
    setEditingSegmentId(null);
    setEditText('');
  };

  const handleEditCancel = () => {
    setEditingSegmentId(null);
    setEditText('');
  };

  const jumpToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setSelectedSegment(segments.find(seg => time >= seg.startTime && time <= seg.endTime)?.id || null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return null;
    if (confidence >= 0.7) return <AlertCircle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3 text-red-500" />;
  };

  const exportTranscription = (format: 'txt' | 'srt' | 'vtt') => {
    let content = '';
    
    switch (format) {
      case 'txt':
        content = segments.map(seg => seg.text).join(' ');
        break;
      case 'srt':
        content = segments.map((seg, index) => {
          const startTime = formatSRTTime(seg.startTime);
          const endTime = formatSRTTime(seg.endTime);
          return `${index + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
        }).join('\n');
        break;
      case 'vtt':
        content = 'WEBVTT\n\n' + segments.map(seg => {
          const startTime = formatSRTTime(seg.startTime);
          const endTime = formatSRTTime(seg.endTime);
          return `${startTime} --> ${endTime}\n${seg.text}\n`;
        }).join('\n');
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onExport) {
      onExport(format);
    }
  };

  const formatSRTTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const averageConfidence = segments.length > 0 
    ? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length 
    : 0;

  return (
    <Card className={`p-6 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transcription
            {isRealTime && (
              <Badge variant="secondary" className="ml-2">
                Real-time
              </Badge>
            )}
          </h3>
          
          {segments.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Avg. Confidence: {(averageConfidence * 100).toFixed(1)}%
              </span>
              <Button
                onClick={() => setShowConfidenceScores(!showConfidenceScores)}
                variant="ghost"
                size="sm"
              >
                {showConfidenceScores ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
        
        {/* Export Options */}
        {segments.length > 0 && (
          <div className="flex space-x-2">
            <Button
              onClick={() => exportTranscription('txt')}
              variant="outline"
              size="sm"
            >
              TXT
            </Button>
            <Button
              onClick={() => exportTranscription('srt')}
              variant="outline"
              size="sm"
            >
              SRT
            </Button>
            <Button
              onClick={() => exportTranscription('vtt')}
              variant="outline"
              size="sm"
            >
              VTT
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            {isRealTime ? 'Processing audio...' : 'Transcribing audio...'}
          </span>
        </div>
      )}

      {/* Transcription Segments */}
      {segments.length > 0 && (
        <div 
          ref={containerRef}
          className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
        >
          {segments.map((segment) => (
            <div
              key={segment.id}
              ref={el => {segmentRefs.current[segment.id] = el;}}
              className={`p-3 rounded-lg border transition-all duration-200 ${
                selectedSegment === segment.id 
                  ? 'bg-blue-50 border-blue-300 dark:bg-blue-900 dark:border-blue-700' 
                  : 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600'
              } hover:shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Timestamp */}
                  <div className="flex items-center space-x-2 mb-2">
                    <button
                      onClick={() => jumpToTime(segment.startTime)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</span>
                    </button>
                    
                    {segment.speaker && (
                      <Badge variant="outline" className="text-xs">
                        {segment.speaker}
                      </Badge>
                    )}
                    
                    {showConfidenceScores && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs flex items-center space-x-1 ${getConfidenceColor(segment.confidence)}`}
                      >
                        {getConfidenceIcon(segment.confidence)}
                        <span>{(segment.confidence * 100).toFixed(0)}%</span>
                      </Badge>
                    )}
                  </div>
                  
                  {/* Text Content */}
                  {editingSegmentId === segment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border rounded resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleEditSave}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          onClick={handleEditCancel}
                          variant="outline"
                          size="sm"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                      {segment.text}
                    </p>
                  )}
                </div>
                
                {/* Edit Button */}
                {!editingSegmentId && onSegmentEdit && (
                  <Button
                    onClick={() => handleEditStart(segment)}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && segments.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-lg mb-2">No transcription yet</div>
          <div className="text-sm">
            {isRealTime 
              ? 'Start speaking to see real-time transcription'
              : 'Upload audio or start recording to generate transcription'
            }
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          className="hidden"
        />
      )}
    </Card>
  );
};

export default TranscriptionDisplay;