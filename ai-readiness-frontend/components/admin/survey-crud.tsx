'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Trash2, 
  Edit, 
  Plus, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Survey } from '@/lib/types'
import { createSurvey, updateSurvey, deleteSurvey } from '@/lib/services/admin'

interface SurveyFormData {
  title: string
  description: string
  status: Survey['status']
  organizationId?: string
}

interface SurveyCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (survey: Survey) => void
  organizationId?: string
  createdBy: string
}

interface SurveyEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (survey: Survey) => void
  survey: Survey | null
}

interface SurveyDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  survey: Survey | null
}

// Survey Create Dialog
export function SurveyCreateDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  organizationId, 
  createdBy 
}: SurveyCreateDialogProps) {
  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    description: '',
    status: 'draft',
    organizationId
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const survey = await createSurvey({
        title: formData.title,
        description: formData.description,
        status: formData.status,
        organizationId: formData.organizationId
      }, createdBy)

      onSuccess(survey)
      onOpenChange(false)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'draft',
        organizationId
      })
    } catch (error) {
      console.error('Failed to create survey:', error)
      setError(error instanceof Error ? error.message : 'Failed to create survey')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Create New Survey</DialogTitle>
            <DialogDescription>
              Create a new survey to collect feedback and insights from your users.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-300">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Survey title"
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose and goals of this survey"
                rows={3}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status" className="text-gray-300">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Survey['status'] }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Card className="border-red-500 bg-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? 'Creating...' : 'Create Survey'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Survey Edit Dialog
export function SurveyEditDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  survey 
}: SurveyEditDialogProps) {
  const [formData, setFormData] = useState<SurveyFormData>({
    title: survey?.title || '',
    description: survey?.description || '',
    status: survey?.status || 'draft',
    organizationId: survey?.organizationId
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update form data when survey changes
  React.useEffect(() => {
    if (survey) {
      setFormData({
        title: survey.title,
        description: survey.description,
        status: survey.status,
        organizationId: survey.organizationId
      })
    }
  }, [survey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!survey) return

    setLoading(true)
    setError(null)

    try {
      const updatedSurvey = await updateSurvey(survey.id, {
        title: formData.title,
        description: formData.description,
        status: formData.status
      })

      onSuccess(updatedSurvey)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update survey:', error)
      setError(error instanceof Error ? error.message : 'Failed to update survey')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Edit Survey</DialogTitle>
            <DialogDescription>
              Update the survey details and settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-300">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Survey title"
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose and goals of this survey"
                rows={3}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status" className="text-gray-300">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Survey['status'] }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Card className="border-red-500 bg-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Survey Delete Dialog
export function SurveyDeleteDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  survey 
}: SurveyDeleteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!survey) return

    setLoading(true)
    setError(null)

    try {
      await deleteSurvey(survey.id)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete survey:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete survey')
    } finally {
      setLoading(false)
    }
  }

  if (!survey) return null

  const hasResponses = survey.metadata.completionRate > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-white">Delete Survey</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">
                You are about to delete:
              </p>
              <p className="font-medium text-white">{survey.title}</p>
            </div>

            {hasResponses && (
              <Card className="border-yellow-500 bg-yellow-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-400">Warning</p>
                      <p className="text-yellow-300">
                        This survey has responses. Deleting it will permanently remove all collected data.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <Badge className={
                  survey.status === 'active' 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : survey.status === 'completed' 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }>
                  {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Questions:</span>
                <span className="text-white">{survey.metadata.totalQuestions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Completion Rate:</span>
                <span className="text-white">{survey.metadata.completionRate}%</span>
              </div>
            </div>

            {error && (
              <Card className="border-red-500 bg-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Survey'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quick Actions Component
interface SurveyQuickActionsProps {
  survey: Survey
  onEdit: (survey: Survey) => void
  onDelete: (survey: Survey) => void
  onStatusChange: (survey: Survey, status: Survey['status']) => void
}

export function SurveyQuickActions({ 
  survey, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: SurveyQuickActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(survey)}
        className="text-gray-300 hover:text-white"
      >
        <Edit className="h-4 w-4 mr-1" />
        Edit
      </Button>

      {survey.status === 'draft' && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onStatusChange(survey, 'active')}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Publish
        </Button>
      )}

      {survey.status === 'active' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onStatusChange(survey, 'completed')}
        >
          Complete
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(survey)}
        className="text-red-400 hover:text-red-300 hover:border-red-400"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
    </div>
  )
}