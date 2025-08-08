'use client';

import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  Volume2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Grid,
  List
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';

interface Recording {
  id: string;
  name: string;
  duration: number; // in seconds
  size: number; // in bytes
  createdAt: Date;
  status: 'processing' | 'completed' | 'failed' | 'transcribing';
  quality: {
    overall: number;
    audioClarity: number;
    backgroundNoise: number;
  };
  transcription?: {
    id: string;
    text: string;
    confidence: number;
    wordCount: number;
  };
  audioUrl?: string;
  tags?: string[];
  metadata?: {
    device?: string;
    sampleRate?: number;
    bitrate?: number;
  };
}

interface RecordingsListProps {
  recordings: Recording[];
  isLoading?: boolean;
  onPlay?: (recording: Recording) => void;
  onDelete?: (recordingId: string) => void;
  onTranscribe?: (recordingId: string) => void;
  onDownload?: (recording: Recording) => void;
  className?: string;
}

type SortField = 'name' | 'createdAt' | 'duration' | 'quality' | 'status';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'processing' | 'completed' | 'failed' | 'transcribing';
type ViewMode = 'list' | 'grid';

export const RecordingsList: React.FC<RecordingsListProps> = ({
  recordings,
  isLoading = false,
  onPlay,
  onDelete,
  onTranscribe,
  onDownload,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const filteredAndSortedRecordings = useMemo(() => {
    let filtered = recordings.filter((recording) => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        recording.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.transcription?.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const statusMatch = statusFilter === 'all' || recording.status === statusFilter;
      
      // Quality filter
      let qualityMatch = true;
      if (qualityFilter !== 'all') {
        const quality = recording.quality.overall;
        qualityMatch = 
          (qualityFilter === 'high' && quality >= 80) ||
          (qualityFilter === 'medium' && quality >= 60 && quality < 80) ||
          (qualityFilter === 'low' && quality < 60);
      }
      
      return searchMatch && statusMatch && qualityMatch;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'quality':
          aValue = a.quality.overall;
          bValue = b.quality.overall;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [recordings, searchTerm, statusFilter, qualityFilter, sortField, sortDirection]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
      case 'transcribing':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'completed': { variant: 'default', className: 'bg-green-100 text-green-800' },
      'failed': { variant: 'destructive', className: 'bg-red-100 text-red-800' },
      'processing': { variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
      'transcribing': { variant: 'secondary', className: 'bg-purple-100 text-purple-800' }
    };
    
    return (
      <Badge {...variants[status] || variants.completed}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-600';
    if (quality >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectRecording = (recordingId: string) => {
    const newSelected = new Set(selectedRecordings);
    if (newSelected.has(recordingId)) {
      newSelected.delete(recordingId);
    } else {
      newSelected.add(recordingId);
    }
    setSelectedRecordings(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecordings.size === filteredAndSortedRecordings.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(filteredAndSortedRecordings.map(r => r.id)));
    }
  };

  const handleBulkDelete = () => {
    if (onDelete && window.confirm(`Delete ${selectedRecordings.size} recordings?`)) {
      selectedRecordings.forEach(id => onDelete(id));
      setSelectedRecordings(new Set());
    }
  };

  const handlePlay = (recording: Recording) => {
    if (currentlyPlaying === recording.id) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(recording.id);
    }
    if (onPlay) {
      onPlay(recording);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recordings ({filteredAndSortedRecordings.length})
            </h3>
            {selectedRecordings.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedRecordings.size} selected
                </span>
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              variant="outline"
              size="sm"
            >
              {viewMode === 'list' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search recordings, transcriptions, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="transcribing">Transcribing</option>
              <option value="failed">Failed</option>
            </select>
            
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
            >
              <option value="all">All Quality</option>
              <option value="high">High (80+)</option>
              <option value="medium">Medium (60-79)</option>
              <option value="low">Low (<60)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Recordings List/Grid */}
      {isLoading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading recordings...</span>
          </div>
        </Card>
      ) : filteredAndSortedRecordings.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <div className="text-lg mb-2">
              {recordings.length === 0 ? 'No recordings yet' : 'No recordings match your filters'}
            </div>
            <div className="text-sm">
              {recordings.length === 0 
                ? 'Start recording to see your audio files here'
                : 'Try adjusting your search or filter criteria'
              }
            </div>
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRecordings.size === filteredAndSortedRecordings.length && filteredAndSortedRecordings.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('duration')}
                  >
                    Duration {sortField === 'duration' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('quality')}
                  >
                    Quality {sortField === 'quality' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('createdAt')}
                  >
                    Date {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedRecordings.map((recording) => (
                  <tr key={recording.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRecordings.has(recording.id)}
                        onChange={() => handleSelectRecording(recording.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(recording.status)}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {recording.name}
                          </div>
                          {recording.transcription && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {recording.transcription.text.substring(0, 50)}...
                            </div>
                          )}
                          {recording.tags && recording.tags.length > 0 && (
                            <div className="flex space-x-1 mt-1">
                              {recording.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {recording.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{recording.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(recording.status)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{formatDuration(recording.duration)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(recording.size)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`text-sm font-medium ${getQualityColor(recording.quality.overall)}`}>
                          {Math.round(recording.quality.overall)}%
                        </div>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              recording.quality.overall >= 80 ? 'bg-green-500' :
                              recording.quality.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${recording.quality.overall}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(recording.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {recording.audioUrl && (
                          <Button
                            onClick={() => handlePlay(recording)}
                            variant="ghost"
                            size="sm"
                          >
                            {currentlyPlaying === recording.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        )}
                        {recording.status === 'completed' && !recording.transcription && onTranscribe && (
                          <Button
                            onClick={() => onTranscribe(recording.id)}
                            variant="ghost"
                            size="sm"
                            title="Transcribe"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        {onDownload && (
                          <Button
                            onClick={() => onDownload(recording)}
                            variant="ghost"
                            size="sm"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            onClick={() => onDelete(recording.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedRecordings.map((recording) => (
            <Card key={recording.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedRecordings.has(recording.id)}
                    onChange={() => handleSelectRecording(recording.id)}
                    className="rounded"
                  />
                  {getStatusIcon(recording.status)}
                </div>
                {getStatusBadge(recording.status)}
              </div>
              
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 truncate">
                {recording.name}
              </h4>
              
              {recording.transcription && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {recording.transcription.text}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(recording.duration)}</span>
                </div>
                <div className={`font-medium ${getQualityColor(recording.quality.overall)}`}>
                  {Math.round(recording.quality.overall)}%
                </div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {formatDate(recording.createdAt)} • {formatFileSize(recording.size)}
              </div>
              
              {recording.tags && recording.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {recording.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-1">
                  {recording.audioUrl && (
                    <Button
                      onClick={() => handlePlay(recording)}
                      variant="ghost"
                      size="sm"
                    >
                      {currentlyPlaying === recording.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                  )}
                  {recording.status === 'completed' && !recording.transcription && onTranscribe && (
                    <Button
                      onClick={() => onTranscribe(recording.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <FileText className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="flex space-x-1">
                  {onDownload && (
                    <Button
                      onClick={() => onDownload(recording)}
                      variant="ghost"
                      size="sm"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      onClick={() => onDelete(recording.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordingsList;