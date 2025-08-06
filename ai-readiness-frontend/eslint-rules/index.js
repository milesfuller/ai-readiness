/**
 * Local ESLint plugin for Next.js server/client boundary rules
 */

const noInvalidServerClientBoundary = require('./no-invalid-server-client-boundary');

module.exports = {
  rules: {
    'no-invalid-server-client-boundary': noInvalidServerClientBoundary,
  },
  configs: {
    recommended: {
      plugins: ['local'],
      rules: {
        'local/no-invalid-server-client-boundary': 'error',
      },
    },
  },
};