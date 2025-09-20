// Application constants for FlowLink

export const APP_CONSTANTS = {
  // Organization and User IDs (these would come from auth in a real app)
  DEFAULT_ORG_ID: 'cmfroy6570000pldk0c00apwg',
  DEFAULT_USER_ID: 'cmfroy65h0001pldk9103iapw',
  
  // API endpoints
  API_BASE_URL: '/api',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Sync intervals (in milliseconds)
  SYNC_INTERVALS: {
    FAST: 5 * 60 * 1000,      // 5 minutes
    NORMAL: 15 * 60 * 1000,   // 15 minutes
    SLOW: 60 * 60 * 1000,     // 1 hour
  },
  
  // System types
  SYSTEMS: {
    ZENDESK: 'zendesk',
    JIRA: 'jira',
    SALESFORCE: 'salesforce',
    SLACK: 'slack',
    TEAMS: 'teams'
  },
  
  // Record statuses
  RECORD_STATUSES: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    ERROR: 'error'
  },
  
  // Link types
  LINK_TYPES: {
    BIDIRECTIONAL: 'bidirectional',
    UNIDIRECTIONAL: 'unidirectional'
  },
  
  // Field mapping types
  FIELD_MAPPING_TYPES: {
    DIRECT: 'direct',
    COMPUTED: 'computed',
    CONDITIONAL: 'conditional'
  },
  
  // UI Constants
  UI: {
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 5000,
    REFRESH_INTERVAL: 30000,
  },
  
  // Error messages
  ERRORS: {
    GENERIC: 'An unexpected error occurred',
    NETWORK: 'Network error - please check your connection',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    NOT_FOUND: 'The requested resource was not found',
    VALIDATION: 'Please check your input and try again'
  }
};

// Export individual constants for convenience
export const { SYSTEMS, RECORD_STATUSES, LINK_TYPES, FIELD_MAPPING_TYPES } = APP_CONSTANTS;
