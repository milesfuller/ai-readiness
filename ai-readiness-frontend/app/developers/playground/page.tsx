'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CommandLineIcon, 
  PlayIcon,
  BookOpenIcon,
  ClipboardIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const GraphQLPlaygroundPage = () => {
  const [query, setQuery] = useState(`query GetUsers($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    email
    name
    profile {
      firstName
      lastName
      avatar
    }
    assessments {
      id
      score
      completedAt
    }
    createdAt
    lastLoginAt
  }
}`);

  const [variables, setVariables] = useState(`{
  "limit": 10,
  "offset": 0
}`);

  const [response, setResponse] = useState(`{
  "data": {
    "users": [
      {
        "id": "user_12345",
        "email": "john.doe@example.com",
        "name": "John Doe",
        "profile": {
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "https://avatar.example.com/john.jpg"
        },
        "assessments": [
          {
            "id": "assessment_123",
            "score": 85,
            "completedAt": "2024-01-20T14:30:00Z"
          }
        ],
        "createdAt": "2024-01-15T10:00:00Z",
        "lastLoginAt": "2024-01-20T16:45:00Z"
      }
    ]
  }
}`);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'query' | 'variables' | 'headers'>('query');
  const [headers, setHeaders] = useState(`{
  "Authorization": "Bearer your-api-key-here",
  "Content-Type": "application/json"
}`);

  const exampleQueries = [
    {
      name: 'Get Users',
      description: 'Fetch a list of users with their profiles and assessments',
      query: `query GetUsers($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    email
    name
    profile {
      firstName
      lastName
      avatar
    }
    assessments {
      id
      score
      completedAt
    }
    createdAt
    lastLoginAt
  }
}`,
      variables: `{
  "limit": 10,
  "offset": 0
}`
    },
    {
      name: 'Create Assessment',
      description: 'Create a new AI readiness assessment',
      query: `mutation CreateAssessment($input: AssessmentInput!) {
  createAssessment(input: $input) {
    id
    userId
    title
    status
    questions {
      id
      text
      category
      type
    }
    createdAt
  }
}`,
      variables: `{
  "input": {
    "userId": "user_12345",
    "title": "AI Readiness Assessment 2024",
    "templateId": "template_standard"
  }
}`
    },
    {
      name: 'Get Assessment Results',
      description: 'Retrieve detailed assessment results with scoring breakdown',
      query: `query GetAssessment($id: ID!) {
  assessment(id: $id) {
    id
    title
    status
    score
    completedAt
    user {
      id
      name
      email
    }
    categories {
      name
      score
      maxScore
      questions {
        id
        text
        answer
        score
      }
    }
    recommendations {
      category
      priority
      title
      description
    }
  }
}`,
      variables: `{
  "id": "assessment_123"
}`
    },
    {
      name: 'Analytics Query',
      description: 'Get platform analytics and usage statistics',
      query: `query GetAnalytics($timeRange: TimeRange!) {
  analytics(timeRange: $timeRange) {
    totalUsers
    totalAssessments
    completionRate
    averageScore
    topCategories {
      name
      averageScore
      completionCount
    }
    trends {
      date
      userCount
      assessmentCount
      averageScore
    }
  }
}`,
      variables: `{
  "timeRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}`
    }
  ];

  const schemaTypes = [
    {
      name: 'User',
      fields: ['id', 'email', 'name', 'profile', 'assessments', 'createdAt', 'lastLoginAt']
    },
    {
      name: 'Assessment',
      fields: ['id', 'userId', 'title', 'status', 'score', 'completedAt', 'categories', 'recommendations']
    },
    {
      name: 'Profile',
      fields: ['firstName', 'lastName', 'avatar', 'company', 'role']
    },
    {
      name: 'Category',
      fields: ['name', 'score', 'maxScore', 'questions']
    }
  ];

  const executeQuery = async () => {
    setIsLoading(true);
    setError(null);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // In a real implementation, you'd make an actual GraphQL request
      // const response = await fetch('/graphql', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ query, variables: JSON.parse(variables) })
      // });

      // For demo purposes, we'll just update the response
      setResponse(`{
  "data": {
    "users": [
      {
        "id": "user_12345",
        "email": "john.doe@example.com",
        "name": "John Doe",
        "profile": {
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "https://avatar.example.com/john.jpg"
        },
        "assessments": [
          {
            "id": "assessment_123",
            "score": 85,
            "completedAt": "2024-01-20T14:30:00Z"
          }
        ],
        "createdAt": "2024-01-15T10:00:00Z",
        "lastLoginAt": "2024-01-20T16:45:00Z"
      }
    ]
  },
  "extensions": {
    "executionTime": "142ms",
    "queryComplexity": 15
  }
}`);
    } catch (err) {
      setError('Failed to execute query. Please check your syntax and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (example: typeof exampleQueries[0]) => {
    setQuery(example.query);
    setVariables(example.variables);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatQuery = () => {
    // Simple query formatting - in a real app you'd use a proper GraphQL formatter
    try {
      const formatted = query
        .replace(/\s+/g, ' ')
        .replace(/{\s*/g, '{\n  ')
        .replace(/\s*}/g, '\n}');
      setQuery(formatted);
    } catch (err) {
      // Handle formatting errors
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="px-6 py-8 mx-auto max-w-7xl lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <CommandLineIcon className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">GraphQL Playground</h1>
              <p className="text-gray-400 mt-2">Interactive GraphQL IDE for testing queries and mutations</p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-white font-medium">Connected to GraphQL API</div>
              <div className="text-sm text-gray-400">https://api.aireadiness.com/graphql</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="xl:col-span-1 space-y-6"
          >
            {/* Example Queries */}
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Example Queries</h3>
              <div className="space-y-2">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => loadExample(example)}
                    className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="font-medium text-white text-sm">{example.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{example.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Schema Explorer */}
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpenIcon className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Schema</h3>
              </div>
              <div className="space-y-3">
                {schemaTypes.map((type, index) => (
                  <div key={index}>
                    <div className="font-medium text-blue-400 text-sm mb-2">{type.name}</div>
                    <div className="pl-4 space-y-1">
                      {type.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="text-xs text-gray-400 font-mono">
                          {field}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shortcuts */}
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Run Query</span>
                  <kbd className="px-2 py-1 bg-black/20 rounded text-gray-300">Ctrl+Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Format</span>
                  <kbd className="px-2 py-1 bg-black/20 rounded text-gray-300">Ctrl+Shift+F</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Auto-complete</span>
                  <kbd className="px-2 py-1 bg-black/20 rounded text-gray-300">Ctrl+Space</kbd>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Playground */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="xl:col-span-3 space-y-6"
          >
            {/* Query Input Section */}
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                {(['query', 'variables', 'headers'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 font-medium text-sm capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-orange-400 border-b-2 border-orange-400 bg-white/5'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'query' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-white">GraphQL Query</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={formatQuery}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Format Query"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(query)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Copy Query"
                        >
                          <ClipboardIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full h-80 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-orange-500"
                      placeholder="Enter your GraphQL query here..."
                      spellCheck={false}
                    />
                  </div>
                )}

                {activeTab === 'variables' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-white">Query Variables (JSON)</label>
                      <button
                        onClick={() => copyToClipboard(variables)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Copy Variables"
                      >
                        <ClipboardIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={variables}
                      onChange={(e) => setVariables(e.target.value)}
                      className="w-full h-80 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-orange-500"
                      placeholder='{\n  "key": "value"\n}'
                      spellCheck={false}
                    />
                  </div>
                )}

                {activeTab === 'headers' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-white">HTTP Headers (JSON)</label>
                      <button
                        onClick={() => copyToClipboard(headers)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Copy Headers"
                      >
                        <ClipboardIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      className="w-full h-80 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-orange-500"
                      placeholder='{\n  "Authorization": "Bearer token",\n  "Content-Type": "application/json"\n}'
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>

              {/* Execute Button */}
              <div className="px-6 py-4 border-t border-white/10 bg-white/5">
                <button
                  onClick={executeQuery}
                  disabled={isLoading}
                  className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="w-5 h-5 mr-2" />
                  )}
                  {isLoading ? 'Executing...' : 'Run Query'}
                </button>
                <span className="ml-4 text-sm text-gray-400">Ctrl+Enter</span>
              </div>
            </div>

            {/* Response Section */}
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Response</h3>
                <div className="flex items-center space-x-4">
                  {error && (
                    <div className="flex items-center space-x-2 text-red-400">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      <span className="text-sm">Query Error</span>
                    </div>
                  )}
                  {!error && !isLoading && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span className="text-sm">200 OK</span>
                    </div>
                  )}
                  <button
                    onClick={() => copyToClipboard(response)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Copy Response"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">GraphQL Error</span>
                    </div>
                    <div className="text-red-300 text-sm">{error}</div>
                  </div>
                ) : (
                  <div className="relative">
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-lg">
                        <div className="flex items-center space-x-3 text-white">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          <span>Executing query...</span>
                        </div>
                      </div>
                    )}
                    <pre className="text-sm text-gray-300 bg-black/20 p-4 rounded-lg border border-white/10 overflow-x-auto h-96">
                      {response}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Help Section */}
            <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center space-x-3 mb-4">
                <InformationCircleIcon className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Getting Started</h3>
              </div>
              <div className="text-gray-300 space-y-2">
                <p>• Select an example query from the sidebar to get started</p>
                <p>• Use Ctrl+Space for auto-completion while typing</p>
                <p>• Add variables in the Variables tab to make your queries dynamic</p>
                <p>• Check the Schema section to explore available types and fields</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GraphQLPlaygroundPage;