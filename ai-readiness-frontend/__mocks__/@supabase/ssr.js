/**
 * Mock for @supabase/ssr
 * Provides createServerClient mock for server-side rendering tests
 */

// Default mock client that can be configured per test
const mockClient = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null
    }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    head: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    csv: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    geojson: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    explain: jest.fn().mockResolvedValue({
      data: null,
      error: null
    })
  }),
  rpc: jest.fn().mockResolvedValue({
    data: null,
    error: null
  }),
  schema: jest.fn().mockReturnThis(),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      download: jest.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      list: jest.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      remove: jest.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedURL: 'https://example.com/signed-url' },
        error: null
      }),
      createSignedUrls: jest.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/public-url' }
      })
    })
  }
};

// Mock createServerClient function
const createServerClient = jest.fn((url, key, options = {}) => {
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