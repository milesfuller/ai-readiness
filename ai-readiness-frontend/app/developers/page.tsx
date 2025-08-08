'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  CodeBracketIcon, 
  KeyIcon, 
  DocumentTextIcon, 
  CommandLineIcon,
  GlobeAltIcon,
  ChartBarIcon,
  CubeTransparentIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

const DeveloperPortalPage = () => {
  const features = [
    {
      title: 'API Keys',
      description: 'Generate, manage, and monitor your API keys with detailed usage analytics.',
      icon: KeyIcon,
      href: '/developers/api-keys',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Webhooks',
      description: 'Configure and manage webhook endpoints for real-time notifications.',
      icon: GlobeAltIcon,
      href: '/developers/webhooks',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'API Documentation',
      description: 'Comprehensive interactive documentation with live examples.',
      icon: DocumentTextIcon,
      href: '/developers/documentation',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'GraphQL Playground',
      description: 'Interactive GraphQL IDE for testing queries and mutations.',
      icon: CommandLineIcon,
      href: '/developers/playground',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const stats = [
    { name: 'Active Integrations', value: '2,847', change: '+12%', changeType: 'increase' },
    { name: 'API Calls Today', value: '89,234', change: '+8%', changeType: 'increase' },
    { name: 'Average Latency', value: '143ms', change: '-5%', changeType: 'decrease' },
    { name: 'Success Rate', value: '99.9%', change: '+0.1%', changeType: 'increase' }
  ];

  const quickStart = [
    {
      step: 1,
      title: 'Get API Key',
      description: 'Generate your first API key from the API Keys section.',
      action: 'Create Key'
    },
    {
      step: 2,
      title: 'Make First Call',
      description: 'Use our interactive documentation to test your first API call.',
      action: 'Try API'
    },
    {
      step: 3,
      title: 'Set Up Webhooks',
      description: 'Configure webhooks to receive real-time notifications.',
      action: 'Configure'
    },
    {
      step: 4,
      title: 'Monitor Usage',
      description: 'Track your API usage and performance metrics.',
      action: 'View Analytics'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative px-6 py-24 mx-auto max-w-7xl lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <div className="p-4 rounded-full bg-blue-500/10 backdrop-blur-sm border border-blue-500/20">
                <CubeTransparentIcon className="w-16 h-16 text-blue-400" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              Developer Portal
            </h1>
            <p className="text-xl text-blue-200 mb-8 max-w-3xl mx-auto">
              Build the future of AI with our comprehensive APIs. Access powerful tools, 
              comprehensive documentation, and real-time analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/developers/documentation"
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                View Documentation
              </Link>
              <Link
                href="/developers/api-keys"
                className="inline-flex items-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg backdrop-blur-sm border border-white/20 transition-colors"
              >
                <KeyIcon className="w-5 h-5 mr-2" />
                Get Started
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-16 mx-auto max-w-7xl lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.name}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {stat.change}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Features */}
      <div className="px-6 py-16 mx-auto max-w-7xl lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything You Need to Build
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Powerful tools and resources to accelerate your development workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            >
              <Link
                href={feature.href}
                className="group block p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.color} bg-opacity-10`}>
                    <feature.icon className={`w-8 h-8 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="px-6 py-16 mx-auto max-w-7xl lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-full bg-green-500/10 backdrop-blur-sm border border-green-500/20">
              <BeakerIcon className="w-12 h-12 text-green-400" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Quick Start Guide
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Get up and running in minutes with our step-by-step guide.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {quickStart.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="relative"
            >
              {index < quickStart.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-transparent z-0" />
              )}
              <div className="relative p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 z-10">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                </div>
                <p className="text-gray-400 mb-4 leading-relaxed">
                  {item.description}
                </p>
                <button className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors">
                  {item.action} →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SDK Section */}
      <div className="px-6 py-16 mx-auto max-w-7xl lg:px-8">
        <div className="p-8 rounded-2xl bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border border-purple-500/20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <CodeBracketIcon className="w-12 h-12 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              SDKs & Libraries
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Official SDKs available for all major programming languages and frameworks.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['JavaScript', 'Python', 'Go', 'Java', 'PHP', 'Ruby', '.NET', 'Swift'].map((lang) => (
                <div
                  key={lang}
                  className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium"
                >
                  {lang}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPortalPage;