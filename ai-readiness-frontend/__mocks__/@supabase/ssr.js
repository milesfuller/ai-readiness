/**
 * Mock for @supabase/ssr
 * Provides createServerClient mock for server-side rendering tests
 */
import { vi } from 'vitest'

// Default mock client that can be configured per test
const mockClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({
      error: null
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    head: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    csv: vi.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    geojson: vi.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    explain: vi.fn().mockResolvedValue({
      data: null,
      error: null
    })
  }),
  rpc: vi.fn().mockResolvedValue({
    data: null,
    error: null
  }),
  schema: vi.fn().mockReturnThis(),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      download: vi.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      list: vi.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      remove: vi.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedURL: 'https://example.com/signed-url' },
        error: null
      }),
      createSignedUrls: vi.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/public-url' }
      })
    })
  }
};

// Mock createServerClient function
const createServerClient = vi.fn((url, key, options = {}) => {
  // Handle cookie operations if provided
  if (options.cookies) {
    const { get, set, remove } = options.cookies;
    
    // Mock cookie operations to work with test scenarios
    if (typeof get === 'function') {
      // Allow tests to mock cookie values
      mockClient._cookieGet = get;
    }
    
    if (typeof set === 'function') {
      // Allow tests to track cookie operations
      mockClient._cookieSet = set;
    }
    
    if (typeof remove === 'function') {
      // Allow tests to track cookie removals
      mockClient._cookieRemove = remove;
    }
  }
  
  return mockClient;
});

// Export the mock
module.exports = {
  createServerClient,
  // Export the mock client for direct access in tests
  __mockClient: mockClient
};

// For ESM compatibility
module.exports.default = {
  createServerClient,
  __mockClient: mockClient
};