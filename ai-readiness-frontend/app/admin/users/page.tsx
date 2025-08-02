'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Ban,
  MoreVertical,
  Calendar,
  Mail,
  Building2,
  Shield
} from 'lucide-react'
import { User, AdminFilters } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AdminFilters>({
    search: '',
    role: '',
    department: ''
  })

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockUsers: User[] = [
          {
            id: '1',
            email: 'john.doe@company.com',
            role: 'org_admin',
            organizationId: 'org1',
            profile: {
              id: 'p1',
              userId: '1',
              firstName: 'John',
              lastName: 'Doe',
              department: 'Engineering',
              jobTitle: 'Engineering Manager',
              preferences: {
                theme: 'dark',
                notifications: true,
                voiceInput: false,
                language: 'en'
              }
            },
            createdAt: '2024-01-10T08:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
            lastLogin: '2024-01-25T10:15:00Z'
          },
          {
            id: '2',
            email: 'jane.smith@company.com',
            role: 'user',
            organizationId: 'org1',
            profile: {
              id: 'p2',
              userId: '2',
              firstName: 'Jane',
              lastName: 'Smith',
              department: 'Marketing',
              jobTitle: 'Marketing Specialist',
              preferences: {
                theme: 'dark',
                notifications: true,
                voiceInput: true,
                language: 'en'
              }
            },
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-22T16:45:00Z',
            lastLogin: '2024-01-24T14:20:00Z'
          },
          {
            id: '3',
            email: 'admin@company.com',
            role: 'admin',
            organizationId: 'org1',
            profile: {
              id: 'p3',
              userId: '3',
              firstName: 'Admin',
              lastName: 'User',
              department: 'IT',
              jobTitle: 'System Administrator',
              preferences: {
                theme: 'dark',
                notifications: true,
                voiceInput: false,
                language: 'en'
              }
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-25T12:00:00Z',
            lastLogin: '2024-01-26T09:30:00Z'
          },
          {
            id: '4',
            email: 'sarah.wilson@company.com',
            role: 'user',
            organizationId: 'org1',
            profile: {
              id: 'p4',
              userId: '4',
              firstName: 'Sarah',
              lastName: 'Wilson',
              department: 'Sales',
              jobTitle: 'Sales Representative',
              preferences: {
                theme: 'dark',
                notifications: true,
                voiceInput: false,
                language: 'en'
              }
            },
            createdAt: '2024-01-18T12:00:00Z',
            updatedAt: '2024-01-23T09:15:00Z',
            lastLogin: '2024-01-25T16:45:00Z'
          }
        ]

        // Filter based on current user role
        let filteredUsers = mockUsers
        if (currentUser?.role === 'org_admin') {
          filteredUsers = mockUsers.filter(user => 
            user.organizationId === currentUser.organizationId
          )
        }

        // Apply search filter
        if (filters.search) {
          filteredUsers = filteredUsers.filter(user =>
            user.email.toLowerCase().includes(filters.search!.toLowerCase()) ||
            user.profile?.firstName?.toLowerCase().includes(filters.search!.toLowerCase()) ||
            user.profile?.lastName?.toLowerCase().includes(filters.search!.toLowerCase()) ||
            user.profile?.department?.toLowerCase().includes(filters.search!.toLowerCase())
          )
        }

        // Apply role filter
        if (filters.role) {
          filteredUsers = filteredUsers.filter(user => user.role === filters.role)
        }

        // Apply department filter
        if (filters.department) {
          filteredUsers = filteredUsers.filter(user => 
            user.profile?.department === filters.department
          )
        }

        setUsers(filteredUsers)
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [currentUser, filters])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'org_admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'user': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'org_admin': return <Building2 className="h-4 w-4" />
      case 'user': return <Mail className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getInitials = (user: User) => {
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user.email.substring(0, 2).toUpperCase()
  }

  const uniqueDepartments = Array.from(
    new Set(users.map(user => user.profile?.department).filter(Boolean))
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-gray-400">Manage user accounts and permissions</p>
        </div>
        {currentUser?.role === 'admin' && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-sm text-gray-400">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.role === 'org_admin').length}
                </p>
                <p className="text-sm text-gray-400">Org Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.role === 'user').length}
                </p>
                <p className="text-sm text-gray-400">Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{users.length}</p>
                <p className="text-sm text-gray-400">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.role}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                role: value === 'all' ? '' : value 
              }))}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="org_admin">Org Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.department}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                department: value === 'all' ? '' : value 
              }))}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">User Management</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Department</TableHead>
                <TableHead className="text-gray-300">Last Login</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-gray-700">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.profile?.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-teal-500 to-purple-500 text-white">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">
                          {user.profile?.firstName} {user.profile?.lastName}
                        </p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)}>
                      <span className="flex items-center space-x-1">
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role.replace('_', ' ')}</span>
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-300">{user.profile?.department || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-300">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400">
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No users found</h3>
              <p className="text-gray-400 mb-4">
                {filters.search || filters.role || filters.department
                  ? 'Try adjusting your filters to see more results.'
                  : 'No users are currently registered.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}