'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Flag,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit3,
  Plus,
  Calendar,
  Target,
  Bell,
  Archive,
  Star,
  Bookmark,
  Send
} from 'lucide-react'
import type { DetailedSurveyResponse, AdminNotes } from '@/lib/services/response-service'

interface ResponseStatusManagerProps {
  response: DetailedSurveyResponse
  adminNotes: AdminNotes[]
  onStatusUpdate: (status: string, note?: string) => Promise<void>
  onAddNote: (note: string, type?: 'general' | 'follow_up' | 'concern') => Promise<void>
}

type ResponseStatus = 'normal' | 'flagged' | 'reviewed' | 'follow_up_needed' | 'escalated' | 'archived'

export function ResponseStatusManager({
  response,
  adminNotes,
  onStatusUpdate,
  onAddNote
}: ResponseStatusManagerProps) {
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'general' | 'follow_up' | 'concern'>('general')
  const [selectedStatus, setSelectedStatus] = useState<ResponseStatus>(response.adminStatus || 'normal')
  const [statusNote, setStatusNote] = useState('')
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const statusOptions = [
    { value: 'normal', label: 'Normal', icon: CheckCircle, color: 'text-green-500' },
    { value: 'flagged', label: 'Flagged', icon: Flag, color: 'text-yellow-500' },
    { value: 'reviewed', label: 'Reviewed', icon: Eye, color: 'text-blue-500' },
    { value: 'follow_up_needed', label: 'Follow-up Needed', icon: Bell, color: 'text-orange-500' },
    { value: 'escalated', label: 'Escalated', icon: AlertCircle, color: 'text-red-500' },
    { value: 'archived', label: 'Archived', icon: Archive, color: 'text-gray-500' }
  ]

  const noteTypeOptions = [
    { value: 'general', label: 'General Note', icon: MessageSquare, color: 'text-blue-500' },
    { value: 'follow_up', label: 'Follow-up Required', icon: Bell, color: 'text-orange-500' },
    { value: 'concern', label: 'Concern/Issue', icon: AlertCircle, color: 'text-red-500' }
  ]

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      await onAddNote(newNote, noteType)
      setNewNote('')
      setNoteType('general')
      setShowNoteDialog(false)
    } catch (error) {
      console.error('Failed to add note:', error)
    }
  }

  const handleStatusUpdate = async () => {
    try {
      setIsUpdating(true)
      await onStatusUpdate(selectedStatus, statusNote.trim() || undefined)
      setStatusNote('')
      setShowStatusDialog(false)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: ResponseStatus) => {
    const config = statusOptions.find(opt => opt.value === status)
    if (!config) return null

    const Icon = config.icon
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    )
  }

  const getNoteTypeIcon = (type: 'general' | 'follow_up' | 'concern' | 'status_update') => {
    const config = noteTypeOptions.find(opt => opt.value === type)
    if (!config) return type === 'status_update' ? Bell : MessageSquare
    return config.icon
  }

  const getNoteTypeColor = (type: 'general' | 'follow_up' | 'concern' | 'status_update') => {
    const config = noteTypeOptions.find(opt => opt.value === type)
    return config?.color || (type === 'status_update' ? 'text-blue-500' : 'text-gray-500')
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Response Status
              </CardTitle>
              <CardDescription>
                Current administrative status and flags
              </CardDescription>
            </div>
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Response Status</DialogTitle>
                  <DialogDescription>
                    Change the administrative status for this response
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">New Status</label>
                    <Select value={selectedStatus} onValueChange={(value: ResponseStatus) => setSelectedStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${option.color}`} />
                                {option.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Status Change Note (Optional)
                    </label>
                    <Textarea
                      placeholder="Add a note explaining the status change..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleStatusUpdate} disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : 'Update Status'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Current Status</h4>
                {getStatusBadge(response.adminStatus || 'normal')}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Response Quality</h4>
                <div className="flex items-center gap-2">
                  {response.answers.length === response.totalQuestions ? (
                    <Badge variant="default">Complete</Badge>
                  ) : (
                    <Badge variant="secondary">Incomplete</Badge>
                  )}
                  {response.answers.some(a => a.confidence && a.confidence >= 4) && (
                    <Badge variant="outline">High Confidence</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Last Updated</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4" />
                  {new Date(response.updatedAt || response.startedAt).toLocaleString()}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Total Notes</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MessageSquare className="h-4 w-4" />
                  {adminNotes.length} admin note{adminNotes.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Admin Notes ({adminNotes.length})
              </CardTitle>
              <CardDescription>
                Administrative notes and follow-up actions
              </CardDescription>
            </div>
            <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Admin Note</DialogTitle>
                  <DialogDescription>
                    Add a note for tracking, follow-up, or documentation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Note Type</label>
                    <Select value={noteType} onValueChange={(value: any) => setNoteType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {noteTypeOptions.map(option => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${option.color}`} />
                                {option.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Note Content</label>
                    <Textarea
                      placeholder="Enter your note here..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {adminNotes.length > 0 ? (
            <div className="space-y-4">
              {adminNotes.map((note, index) => {
                const NoteIcon = getNoteTypeIcon(note.type)
                return (
                  <div key={note.id} className="border-l-2 border-teal-400 pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <NoteIcon className={`h-4 w-4 ${getNoteTypeColor(note.type)}`} />
                        <Badge variant="outline" className="text-xs">
                          {noteTypeOptions.find(opt => opt.value === note.type)?.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(note.createdAt)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-2">{note.note}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>by {note.createdBy}</span>
                      <span>•</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No admin notes yet</p>
              <p className="text-sm">Add notes to track follow-ups, concerns, or general observations</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common administrative actions for this response
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedStatus('flagged')
                setStatusNote('Flagged for admin review')
                setShowStatusDialog(true)
              }}
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag for Review
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedStatus('follow_up_needed')
                setNoteType('follow_up')
                setShowNoteDialog(true)
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedStatus('escalated')
                setNoteType('concern')
                setShowNoteDialog(true)
              }}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Escalate Issue
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedStatus('reviewed')
                setStatusNote('Response reviewed and approved')
                setShowStatusDialog(true)
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Mark Reviewed
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setNoteType('general')
                setShowNoteDialog(true)
              }}
            >
              <Star className="h-4 w-4 mr-2" />
              Add Bookmark
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedStatus('archived')
                setStatusNote('Response archived after review')
                setShowStatusDialog(true)
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Response
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}