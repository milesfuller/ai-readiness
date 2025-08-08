'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  CodeBracketIcon,
  PlayIcon,
  ClipboardIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  CommandLineIcon,
  CubeIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
  example?: {
    request?: string;
    response: string;
  };
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface RequestBody {
  type: string;
  required: boolean;
  properties: { [key: string]: any };
}

interface Response {
  status: number;
  description: string;
  example: string;
}

const DocumentationPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('authentication');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set(['get-users']));
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({});

  const categories = [
    { id: 'authentication', name: 'Authentication', icon: ServerIcon },
    { id: 'users', name: 'Users', icon: CubeIcon },
    { id: 'assessments', name: 'Assessments', icon: DocumentTextIcon },
    { id: 'analytics', name: 'Analytics', icon: CommandLineIcon },
  ];

  const endpoints: { [key: string]: ApiEndpoint[] } = {
    authentication: [
      {
        method: 'POST',
        path: '/auth/login',
        title: 'User Login',
        description: 'Authenticate a user and receive an access token',
        requestBody: {
          type: 'object',
          required: true,
          properties: {
            email: { type: 'string', description: 'User email address' },
            password: { type: 'string', description: 'User password' }
          }
        },
        responses: [
          {
            status: 200,
            description: 'Login successful',
            example: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "user_12345",
    "email": "user@example.com",
    "name": "John Doe"
  }
}`
          },
          {
            status: 401,
            description: 'Invalid credentials',
            example: `{
  "error": "invalid_credentials",
  "message": "The email or password is incorrect"
}`
          }
        ],
        example: {
          request: `{
  "email": "user@example.com",
  "password": "secure_password123"
}`,
          response: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}`
        }
      },
      {
        method: 'POST',
        path: '/auth/refresh',
        title: 'Refresh Token',
        description: 'Get a new access token using a refresh token',
        requestBody: {
          type: 'object',
          required: true,
          properties: {
            refresh_token: { type: 'string', description: 'Valid refresh token' }
          }
        },
        responses: [
          {
            status: 200,
            description: 'Token refreshed successfully',
            example: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}`
          }
        ]
      }
    ],
    users: [
      {
        method: 'GET',
        path: '/users',
        title: 'List Users',
        description: 'Retrieve a list of users with pagination support',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number', example: '1' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page', example: '20' },
          { name: 'search', type: 'string', required: false, description: 'Search query', example: 'john' }
        ],
        responses: [
          {
            status: 200,
            description: 'Users retrieved successfully',
            example: `{
  "data": [
    {
      "id": "user_12345",
      "email": "john@example.com",
      "name": "John Doe",
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-20T14:30:00Z",
      "status": "active"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}`
          }
        ]
      },
      {
        method: 'POST',
        path: '/users',
        title: 'Create User',
        description: 'Create a new user account',
        requestBody: {
          type: 'object',
          required: true,
          properties: {
            email: { type: 'string', description: 'User email address' },
            name: { type: 'string', description: 'User full name' },
            password: { type: 'string', description: 'User password' },
            role: { type: 'string', description: 'User role', enum: ['user', 'admin'] }
          }
        },
        responses: [
          {
            status: 201,
            description: 'User created successfully',
            example: `{
  "id": "user_67890",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "created_at": "2024-01-20T15:00:00Z",
  "status": "active"
}`
          }
        ]
      }
    ],
    assessments: [
      {
        method: 'GET',
        path: '/assessments',
        title: 'List Assessments',
        description: 'Retrieve AI readiness assessments',
        parameters: [
          { name: 'user_id', type: 'string', required: false, description: 'Filter by user ID' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status', example: 'completed' }
        ],
        responses: [
          {
            status: 200,
            description: 'Assessments retrieved successfully',
            example: `{
  "data": [
    {
      "id": "assessment_123",
      "user_id": "user_456",
      "title": "AI Readiness Assessment 2024",
      "status": "completed",
      "score": 85,
      "completed_at": "2024-01-20T16:30:00Z",
      "categories": {
        "technical": 90,
        "organizational": 80,
        "strategic": 85
      }
    }
  ]
}`
          }
        ]
      }
    ],
    analytics: [
      {
        method: 'GET',
        path: '/analytics/usage',
        title: 'Usage Analytics',
        description: 'Get API usage statistics and metrics',
        parameters: [
          { name: 'start_date', type: 'string', required: false, description: 'Start date (ISO 8601)' },
          { name: 'end_date', type: 'string', required: false, description: 'End date (ISO 8601)' },
          { name: 'granularity', type: 'string', required: false, description: 'Data granularity', example: 'day' }
        ],
        responses: [
          {
            status: 200,
            description: 'Analytics data retrieved',
            example: `{
  "total_requests": 15420,
  "unique_users": 342,
  "avg_response_time": 145,
  "success_rate": 99.8,
  "data_points": [
    {
      "date": "2024-01-20",
      "requests": 1250,
      "errors": 2,
      "avg_response_time": 142
    }
  ]
}`
          }
        ]
      }
    ]
  };

  const toggleEndpoint = (endpointId: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(endpointId)) {
      newExpanded.delete(endpointId);
    } else {
      newExpanded.add(endpointId);
    }
    setExpandedEndpoints(newExpanded);
  };

  const setTabForEndpoint = (endpointId: string, tab: string) => {
    setActiveTab({ ...activeTab, [endpointId]: tab });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Add toast notification here
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500/20 text-green-400';
      case 'POST': return 'bg-blue-500/20 text-blue-400';
      case 'PUT': return 'bg-orange-500/20 text-orange-400';
      case 'DELETE': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const generateEndpointId = (method: string, path: string) => {
    return `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="px-6 py-8 mx-auto max-w-7xl lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <DocumentTextIcon className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">API Documentation</h1>
              <p className="text-gray-400 mt-2">Comprehensive guide to our REST API</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white">24</div>
              <div className="text-sm text-gray-400">Endpoints</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-sm text-gray-400">Categories</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white">v1.2</div>
              <div className="text-sm text-gray-400">API Version</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-sm text-gray-400">Uptime</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-8 p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">API Categories</h3>
              <nav className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <category.icon className="w-5 h-5" />
                    <span>{category.name}</span>
                  </button>
                ))}
              </nav>

              {/* Base URL Info */}
              <div className="mt-8 p-4 bg-black/20 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-white mb-2">Base URL</h4>
                <code className="text-sm text-blue-400">https://api.aireadiness.com/v1</code>
                <button
                  onClick={() => copyToClipboard('https://api.aireadiness.com/v1')}
                  className="ml-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ClipboardIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Authentication Info */}
              <div className="mt-4 p-4 bg-black/20 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-white mb-2">Authentication</h4>
                <p className="text-xs text-gray-400 mb-2">Bearer Token Required</p>
                <code className="text-xs text-blue-400">Authorization: Bearer {'{token}'}</code>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="space-y-6">
              {endpoints[selectedCategory]?.map((endpoint) => {
                const endpointId = generateEndpointId(endpoint.method, endpoint.path);
                const isExpanded = expandedEndpoints.has(endpointId);
                const currentTab = activeTab[endpointId] || 'overview';

                return (
                  <div
                    key={endpointId}
                    className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden"
                  >
                    {/* Endpoint Header */}
                    <button
                      onClick={() => toggleEndpoint(endpointId)}
                      className="w-full p-6 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <code className="text-lg font-mono text-white">{endpoint.path}</code>
                        </div>
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="mt-2">
                        <h3 className="text-xl font-semibold text-white">{endpoint.title}</h3>
                        <p className="text-gray-400 mt-1">{endpoint.description}</p>
                      </div>
                    </button>

                    {/* Endpoint Details */}
                    {isExpanded && (
                      <div className="border-t border-white/10">
                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                          {['overview', 'example', 'test'].map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setTabForEndpoint(endpointId, tab)}
                              className={`px-6 py-4 font-medium text-sm capitalize transition-colors ${
                                currentTab === tab
                                  ? 'text-blue-400 border-b-2 border-blue-400'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="p-6">
                          {currentTab === 'overview' && (
                            <div className="space-y-6">
                              {/* Parameters */}
                              {endpoint.parameters && endpoint.parameters.length > 0 && (
                                <div>
                                  <h4 className="text-lg font-medium text-white mb-4">Parameters</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b border-white/10">
                                          <th className="text-left py-2 text-sm font-medium text-gray-400">Name</th>
                                          <th className="text-left py-2 text-sm font-medium text-gray-400">Type</th>
                                          <th className="text-left py-2 text-sm font-medium text-gray-400">Required</th>
                                          <th className="text-left py-2 text-sm font-medium text-gray-400">Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {endpoint.parameters.map((param) => (
                                          <tr key={param.name} className="border-b border-white/5">
                                            <td className="py-3 text-blue-400 font-mono text-sm">{param.name}</td>
                                            <td className="py-3 text-gray-300 text-sm">{param.type}</td>
                                            <td className="py-3 text-sm">
                                              <span className={`px-2 py-1 rounded text-xs ${
                                                param.required 
                                                  ? 'bg-red-500/20 text-red-400' 
                                                  : 'bg-gray-500/20 text-gray-400'
                                              }`}>
                                                {param.required ? 'Required' : 'Optional'}
                                              </span>
                                            </td>
                                            <td className="py-3 text-gray-300 text-sm">{param.description}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Request Body */}
                              {endpoint.requestBody && (
                                <div>
                                  <h4 className="text-lg font-medium text-white mb-4">Request Body</h4>
                                  <div className="p-4 bg-black/20 rounded-lg border border-gray-700">
                                    <div className="text-sm text-gray-400 mb-2">
                                      Type: <span className="text-blue-400">{endpoint.requestBody.type}</span>
                                      {endpoint.requestBody.required && (
                                        <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Required</span>
                                      )}
                                    </div>
                                    <pre className="text-sm text-gray-300 overflow-x-auto">
                                      {JSON.stringify(endpoint.requestBody.properties, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Responses */}
                              <div>
                                <h4 className="text-lg font-medium text-white mb-4">Responses</h4>
                                <div className="space-y-4">
                                  {endpoint.responses.map((response) => (
                                    <div key={response.status} className="border border-white/10 rounded-lg">
                                      <div className="p-4 border-b border-white/10">
                                        <div className="flex items-center space-x-3">
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            response.status < 300 
                                              ? 'bg-green-500/20 text-green-400'
                                              : response.status < 400
                                              ? 'bg-yellow-500/20 text-yellow-400'
                                              : 'bg-red-500/20 text-red-400'
                                          }`}>
                                            {response.status}
                                          </span>
                                          <span className="text-white font-medium">{response.description}</span>
                                        </div>
                                      </div>
                                      <div className="p-4 bg-black/20">
                                        <pre className="text-sm text-gray-300 overflow-x-auto">
                                          {response.example}
                                        </pre>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {currentTab === 'example' && endpoint.example && (
                            <div className="space-y-6">
                              {endpoint.example.request && (
                                <div>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-medium text-white">Request Example</h4>
                                    <button
                                      onClick={() => copyToClipboard(endpoint.example!.request!)}
                                      className="text-gray-400 hover:text-white transition-colors"
                                    >
                                      <ClipboardIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="p-4 bg-black/20 rounded-lg border border-gray-700">
                                    <pre className="text-sm text-gray-300 overflow-x-auto">
                                      {endpoint.example.request}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-lg font-medium text-white">Response Example</h4>
                                  <button
                                    onClick={() => copyToClipboard(endpoint.example!.response)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <ClipboardIcon className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="p-4 bg-black/20 rounded-lg border border-gray-700">
                                  <pre className="text-sm text-gray-300 overflow-x-auto">
                                    {endpoint.example.response}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}

                          {currentTab === 'test' && (
                            <div className="space-y-6">
                              <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-center space-x-3 mb-4">
                                  <PlayIcon className="w-6 h-6 text-blue-400" />
                                  <h4 className="text-lg font-medium text-white">Test This Endpoint</h4>
                                </div>
                                <p className="text-gray-400 mb-4">
                                  Try this endpoint with your API key. Make sure to authenticate first.
                                </p>
                                <button className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                                  <PlayIcon className="w-4 h-4 mr-2" />
                                  Try It Out
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;