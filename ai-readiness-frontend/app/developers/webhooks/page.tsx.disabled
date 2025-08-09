'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GlobeAltIcon, 
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BoltIcon,
  ChartBarIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  created: string;
  lastTriggered: string;
  successRate: number;
  totalDeliveries: number;
}

const WebhooksPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: '1',
      name: 'Production Notifications',
      url: 'https://api.yourapp.com/webhooks/notifications',
      events: ['user.created', 'payment.completed', 'subscription.updated'],
      status: 'active',
      created: '2024-01-15',
      lastTriggered: '2024-01-20 14:30',
      successRate: 99.5,
      totalDeliveries: 2847
    },
    {
      id: '2',
      name: 'Analytics Tracker',
      url: 'https://analytics.yourapp.com/webhook',
      events: ['api.request', 'user.activity'],
      status: 'active',
      created: '2024-01-10',
      lastTriggered: '2024-01-20 14:25',
      successRate: 98.2,
      totalDeliveries: 15623
    },
    {
      id: '3',
      name: 'Slack Notifications',
      url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      events: ['system.alert', 'error.critical'],
      status: 'failed',
      created: '2024-01-05',
      lastTriggered: '2024-01-19 09:15',
      successRate: 45.8,
      totalDeliveries: 892
    }
  ]);

  const availableEvents = [
    { name: 'user.created', description: 'New user registration' },
    { name: 'user.updated', description: 'User profile updated' },
    { name: 'user.deleted', description: 'User account deleted' },
    { name: 'payment.completed', description: 'Payment successfully processed' },
    { name: 'payment.failed', description: 'Payment processing failed' },
    { name: 'subscription.created', description: 'New subscription created' },
    { name: 'subscription.updated', description: 'Subscription modified' },
    { name: 'subscription.cancelled', description: 'Subscription cancelled' },
    { name: 'api.request', description: 'API request made' },
    { name: 'api.error', description: 'API error occurred' },
    { name: 'system.alert', description: 'System alert triggered' },
    { name: 'error.critical', description: 'Critical error occurred' }
  ];

  const createWebhook = () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0) return;
    
    const newWebhook: Webhook = {
      id: Date.now().toString(),
      name: newWebhookName,
      url: newWebhookUrl,
      events: selectedEvents,
      status: 'active',
      created: new Date().toISOString().split('T')[0],
      lastTriggered: 'Never',
      successRate: 100,
      totalDeliveries: 0
    };
    
    setWebhooks([newWebhook, ...webhooks]);
    setNewWebhookName('');
    setNewWebhookUrl('');
    setSelectedEvents([]);
    setShowCreateModal(false);
  };

  const deleteWebhook = (webhookId: string) => {
    setWebhooks(webhooks.filter(webhook => webhook.id !== webhookId));
  };

  const toggleWebhookStatus = (webhookId: string) => {
    setWebhooks(webhooks.map(webhook => 
      webhook.id === webhookId 
        ? { ...webhook, status: webhook.status === 'active' ? 'inactive' : 'active' as const }
        : webhook
    ));
  };

  const testWebhook = async (webhookId: string) => {
    // Simulate webhook test
    const webhook = webhooks.find(w => w.id === webhookId);
    if (webhook) {
      // In a real implementation, you'd make an actual HTTP request
      console.log(`Testing webhook: ${webhook.url}`);
      // Show success/failure notification
    }
  };

  const stats = [
    { 
      name: 'Total Webhooks', 
      value: webhooks.length.toString(), 
      change: '+1 this month',
      icon: GlobeAltIcon 
    },
    { 
      name: 'Active Webhooks', 
      value: webhooks.filter(w => w.status === 'active').length.toString(), 
      change: '2 operational',
      icon: CheckCircleIcon 
    },
    { 
      name: 'Total Deliveries', 
      value: '19.4K', 
      change: '+12% this week',
      icon: BoltIcon 
    },
    { 
      name: 'Success Rate', 
      value: '97.8%', 
      change: '+2.1% improvement',
      icon: ChartBarIcon 
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'inactive':
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'inactive':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
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
          className="mb-12"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <GlobeAltIcon className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Webhooks</h1>
                <p className="text-gray-400 mt-2">Configure and manage webhook endpoints</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Webhook
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
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-8 h-8 text-purple-400" />
                <span className="text-sm text-blue-400">{stat.change}</span>
              </div>
              <p className="text-sm text-gray-400">{stat.name}</p>
              <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Webhooks List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          {webhooks.map((webhook, index) => (
            <motion.div
              key={webhook.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(webhook.status)}
                  <div>
                    <h3 className="text-xl font-semibold text-white">{webhook.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">Created {webhook.created}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(webhook.status)}`}>
                    {webhook.status}
                  </span>
                  <button
                    onClick={() => toggleWebhookStatus(webhook.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Toggle Status"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Webhook"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <label className="text-sm text-gray-400">Endpoint URL</label>
                    <div className="mt-1 p-3 bg-black/20 rounded-lg border border-gray-700">
                      <code className="text-sm text-gray-300 break-all">{webhook.url}</code>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Subscribed Events</label>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map(event => (
                        <span
                          key={event}
                          className="px-3 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Success Rate</span>
                      <span className="text-lg font-bold text-white">{webhook.successRate}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${webhook.successRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <div>
                      <span className="text-2xl font-bold text-white">{webhook.totalDeliveries.toLocaleString()}</span>
                      <p className="text-xs text-gray-400">Total Deliveries</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Last Triggered</span>
                      <p className="text-sm text-white">{webhook.lastTriggered}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => testWebhook(webhook.id)}
                    className="w-full py-2 px-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
                  >
                    Test Webhook
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Webhook Documentation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 p-8 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <div className="flex items-center space-x-3 mb-6">
            <CodeBracketIcon className="w-6 h-6 text-blue-400" />
            <h3 className="text-2xl font-semibold text-white">Webhook Implementation Guide</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-medium text-white mb-4">Example Payload</h4>
              <div className="p-4 bg-black/40 rounded-lg border border-gray-700">
                <pre className="text-sm text-gray-300 overflow-x-auto">
{`{
  "event": "user.created",
  "timestamp": "2024-01-20T14:30:00Z",
  "data": {
    "id": "user_12345",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-20T14:30:00Z"
  },
  "webhook_id": "wh_abc123"
}`}
                </pre>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-white mb-4">Response Requirements</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Return 200-299 status code for success</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Respond within 10 seconds</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Handle duplicate events idempotently</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Verify webhook signature (recommended)</span>
                </li>
              </ul>
              
              <div className="mt-6">
                <h5 className="text-sm font-medium text-white mb-2">Retry Policy</h5>
                <p className="text-sm text-gray-400">
                  Failed webhooks are retried up to 3 times with exponential backoff: 
                  1s, 10s, 100s intervals.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-800 rounded-xl p-8 m-4 max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <PlusIcon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Create New Webhook</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Webhook Name
                </label>
                <input
                  type="text"
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                  placeholder="e.g., Production Notifications"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/webhook"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Events
                </label>
                <div className="max-h-64 overflow-y-auto border border-white/10 rounded-lg p-4 bg-white/5">
                  <div className="space-y-3">
                    {availableEvents.map(event => (
                      <label key={event.name} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvents([...selectedEvents, event.name]);
                            } else {
                              setSelectedEvents(selectedEvents.filter(s => s !== event.name));
                            }
                          }}
                          className="mt-1 rounded border-gray-600 bg-gray-700 text-purple-600"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">{event.name}</div>
                          <div className="text-xs text-gray-400">{event.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-8">
              <button
                onClick={createWebhook}
                disabled={!newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Create Webhook
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

export default WebhooksPage;