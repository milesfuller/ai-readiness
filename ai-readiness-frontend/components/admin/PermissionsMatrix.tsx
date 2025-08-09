'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Shield, 
  Lock, 
  Unlock,
  Save,
  RotateCcw,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { 
  Role, 
  RBACService, 
  ROLE_PERMISSIONS,
  PERMISSIONS 
} from '@/lib/auth/rbac'

import { useToast } from '@/lib/hooks/use-toast'

// Define local types for permissions
type Permission = string
type PermissionCategory = 'system' | 'organization' | 'user' | 'survey' | 'report' | 'analytics'
type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage'

interface PermissionCell {
  role: Role
  permission: Permission
  hasPermission: boolean
  isInherited: boolean
  isCustom: boolean
}

export function PermissionsMatrix() {
  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map())
  const [customPermissions, setCustomPermissions] = useState<Map<string, string[]>>(new Map())
  const [editMode, setEditMode] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const allPermissions = Object.values(PERMISSIONS)
  const allRoles = Object.values(Role)
  const categories: PermissionCategory[] = ['system', 'organization', 'user', 'survey', 'report', 'analytics']

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      // Initialize permissions map from ROLE_PERMISSIONS
      const permMap = new Map<string, boolean>()
      
      allRoles.forEach(role => {
        const rolePerms = ROLE_PERMISSIONS[role] || []
        allPermissions.forEach(perm => {
          const key = `${role}:${perm}`
          permMap.set(key, rolePerms.includes(perm))
        })
      })
      
      setPermissions(permMap)
      
      // Load custom permissions from API
      const response = await fetch('/api/v1/permissions/custom', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCustomPermissions(new Map(Object.entries(data.customPermissions || {})))
      }
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const isPermissionInherited = (role: Role, permission: Permission): boolean => {
    // Check if permission is inherited from a lower role
    const roleHierarchy: Role[] = [Role.VIEWER, Role.USER, Role.ANALYST, Role.ORG_ADMIN, Role.SUPER_ADMIN]
    const roleIndex = roleHierarchy.indexOf(role)
    
    if (roleIndex <= 0) return false
    
    for (let i = 0; i < roleIndex; i++) {
      const lowerRole = roleHierarchy[i]
      if (ROLE_PERMISSIONS[lowerRole]?.includes(permission)) {
        return true
      }
    }
    
    return false
  }

  const togglePermission = (role: Role, permission: Permission) => {
    if (!editMode) return
    
    const key = `${role}:${permission}`
    const newPermissions = new Map(permissions)
    newPermissions.set(key, !permissions.get(key))
    setPermissions(newPermissions)
    setHasChanges(true)
  }

  const saveChanges = async () => {
    try {
      setLoading(true)
      
      // Collect changes
      const changes: Record<string, string[]> = {}
      
      allRoles.forEach(role => {
        const customPerms: string[] = []
        allPermissions.forEach(perm => {
          const key = `${role}:${perm}`
          const hasPermission = permissions.get(key)
          const isDefault = ROLE_PERMISSIONS[role]?.includes(perm)
          
          // Track custom additions (permissions not in default set)
          if (hasPermission && !isDefault) {
            customPerms.push(perm)
          }
        })
        
        if (customPerms.length > 0) {
          changes[role] = customPerms
        }
      })
      
      // Save to API
      const response = await fetch('/api/v1/permissions/custom', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ customPermissions: changes })
      })
      
      if (!response.ok) throw new Error('Failed to save permissions')
      
      toast({
        title: 'Success',
        description: 'Permissions updated successfully'
      })
      
      setHasChanges(false)
      setEditMode(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save permissions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetChanges = () => {
    loadPermissions()
    setHasChanges(false)
  }

  const getCategoryPermissions = (category: PermissionCategory): Permission[] => {
    return allPermissions.filter(p => p.startsWith(`${category}:`))
  }

  const getRoleColumnColor = (role: Role): string => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return 'bg-purple-50 border-purple-200'
      case Role.ORG_ADMIN:
        return 'bg-blue-50 border-blue-200'
      case Role.ANALYST:
        return 'bg-green-50 border-green-200'
      case Role.USER:
        return 'bg-gray-50 border-gray-200'
      case Role.VIEWER:
        return 'bg-gray-50 border-gray-100'
      default:
        return 'bg-white'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions Matrix
            </CardTitle>
            <CardDescription>
              Configure role-based permissions across the system
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={resetChanges}
                  disabled={!hasChanges || loading}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={saveChanges}
                  disabled={!hasChanges || loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditMode(true)}
                disabled={loading}
              >
                <Lock className="h-4 w-4 mr-2" />
                Edit Permissions
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editMode && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You are in edit mode. Check/uncheck permissions to modify role capabilities.
              Inherited permissions are shown with a different background.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[600px] w-full">
          <div className="min-w-max">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white border p-2 text-left min-w-[250px]">
                    Permission
                  </th>
                  {allRoles.map(role => (
                    <th
                      key={role}
                      className={`border p-2 text-center min-w-[120px] ${getRoleColumnColor(role)}`}
                    >
                      <div className="font-semibold text-sm">
                        {RBACService.getRoleDisplayName(role)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {ROLE_PERMISSIONS[role].length} perms
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <React.Fragment key={category}>
                    <tr>
                      <td
                        colSpan={allRoles.length + 1}
                        className="bg-gray-100 border p-2 font-semibold text-sm uppercase tracking-wide"
                      >
                        {category.replace('_', ' ')}
                      </td>
                    </tr>
                    {getCategoryPermissions(category).map(permission => (
                      <tr key={permission} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white border p-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {RBACService.getPermissionDisplayName(permission)}
                                  </span>
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{permission}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        {allRoles.map(role => {
                          const key = `${role}:${permission}`
                          const hasPermission = permissions.get(key) || false
                          const isInherited = isPermissionInherited(role, permission)
                          const isCustom = customPermissions.get(role)?.includes(permission) || false
                          
                          return (
                            <td
                              key={key}
                              className={`border p-2 text-center ${getRoleColumnColor(role)}`}
                            >
                              <div className="flex justify-center items-center">
                                {editMode ? (
                                  <Checkbox
                                    checked={hasPermission}
                                    onCheckedChange={() => togglePermission(role, permission)}
                                    disabled={isInherited || role === Role.SUPER_ADMIN}
                                    className={isInherited ? 'opacity-50' : ''}
                                  />
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {hasPermission ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-gray-300" />
                                    )}
                                    {isCustom && (
                                      <Badge variant="outline" className="text-xs">
                                        Custom
                                      </Badge>
                                    )}
                                    {isInherited && (
                                      <Badge variant="outline" className="text-xs">
                                        Inherited
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Has Permission</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-300" />
              <span>No Permission</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Inherited
              </Badge>
              <span>From Lower Role</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Custom
              </Badge>
              <span>Custom Addition</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Total: {allPermissions.length} permissions × {allRoles.length} roles
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PermissionsMatrix