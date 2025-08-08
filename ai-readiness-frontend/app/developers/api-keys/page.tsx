'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  TrashIcon,
  PlusIcon,
  ClipboardIcon,
  ChartBarIcon,
  CalendarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  requests: number;
  status: 'active' | 'revoked';
  scopes: string[];
}

const ApiKeysPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'sk-1234567890abcdef1234567890abcdef12345678',
      created: '2024-01-15',
      lastUsed: '2024-01-20',
      requests: 45623,
      status: 'active',
      scopes: ['read', 'write', 'admin']
    },
    {
      id: '2',
      name: 'Development API',
      key: 'sk-abcdef1234567890abcdef1234567890abcdef12',
      created: '2024-01-10',
      lastUsed: '2024-01-19',
      requests: 12847,
      status: 'active',
      scopes: ['read', 'write']
    },
    {
      id: '3',
      name: 'Staging Environment',
      key: 'sk-fedcba0987654321fedcba0987654321fedcba09',
      created: '2024-01-05',
      lastUsed: '2024-01-18',
      requests: 8921,
      status: 'revoked',
      scopes: ['read']
    }
  ]);

  const availableScopes = [
    { name: 'read', description: 'Read access to all resources' },
    { name: 'write', description: 'Write access to create and update resources' },
    { name: 'delete', description: 'Delete access to remove resources' },
    { name: 'admin', description: 'Full administrative access' }
  ];

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const createApiKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: 'sk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      requests: 0,
      status: 'active',
      scopes: selectedScopes
    };
    
    setApiKeys([newKey, ...apiKeys]);
    setNewKeyName('');
    setSelectedScopes([]);
    setShowCreateModal(false);
  };

  const revokeApiKey = (keyId: string) => {
    setApiKeys(apiKeys.map(key => 
      key.id === keyId ? { ...key, status: 'revoked' as const } : key
    ));
  };

  const deleteApiKey = (keyId: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== keyId));
  };

  const maskKey = (key: string) => {
    return key.substring(0, 8) + '••••••••••••••••••••••••••••••••' + key.substring(key.length - 4);
  };

  const stats = [
    { name: 'Total API Keys', value: apiKeys.length.toString(), change: '+2 this month' },
    { name: 'Active Keys', value: apiKeys.filter(k => k.status === 'active').length.toString(), change: 'All operational' },
    { name: 'Total Requests', value: '67.4K', change: '+8.2% from last month' },
    { name: 'Success Rate', value: '99.9%', change: '+0.1% improvement' }
  ];

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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <KeyIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">API Keys</h1>
                <p className="text-gray-400 mt-2">Manage your API keys and monitor usage</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create New Key
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 mb-12 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <p className="text-sm text-gray-400">{stat.name}</p>
              <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
              <p className="text-sm text-blue-400 mt-2">{stat.change}</p>
            </motion.div>
          ))}
        </div>

        {/* API Keys List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden"
        >
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-semibold text-white">Your API Keys</h2>
            <p className="text-gray-400 mt-2">Manage and monitor your API key usage</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{apiKey.name}</div>
                        <div className="text-xs text-gray-400">
                          Created {apiKey.created}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {apiKey.scopes.map(scope => (
                            <span
                              key={scope}
                              className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-md"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm text-gray-300 bg-black/20 px-2 py-1 rounded">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeSlashIcon className="w-4 h-4" />
                          ) : (
                            <EyeIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <ClipboardIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {apiKey.requests.toLocaleString()} requests
                      </div>
                      <div className="text-xs text-gray-400">
                        Last used: {apiKey.lastUsed}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        apiKey.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {apiKey.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {apiKey.status === 'active' && (
                          <button
                            onClick={() => revokeApiKey(apiKey.id)}
                            className="text-yellow-400 hover:text-yellow-300 transition-colors"
                            title="Revoke Key"
                          >
                            <EyeSlashIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteApiKey(apiKey.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Key"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Usage Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 p-8 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">API Usage Analytics</h3>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm">Last 30 days</span>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
            <div className="text-center text-gray-400">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Usage analytics chart would go here</p>
              <p className="text-sm mt-2">Real-time API usage and performance metrics</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-800 rounded-xl p-8 m-4 max-w-md w-full border border-white/10"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <PlusIcon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Create New API Key</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Scopes
                </label>
                <div className="space-y-2">
                  {availableScopes.map(scope => (
                    <label key={scope.name} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedScopes([...selectedScopes, scope.name]);
                          } else {
                            setSelectedScopes(selectedScopes.filter(s => s !== scope.name));
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600"
                      />
                      <div>
                        <div className="text-white font-medium">{scope.name}</div>
                        <div className="text-xs text-gray-400">{scope.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-8">
              <button
                onClick={createApiKey}
                disabled={!newKeyName.trim() || selectedScopes.length === 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Create Key
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ApiKeysPage;