// Constants used across the FlowLink application

// User and Organization IDs
export const CURRENT_USER_ID = 'cmfroy65h0001pldk9103iapw';
export const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

// Default column configuration
export const DEFAULT_COLUMNS = [
  'zendesk.id', 
  'zendesk.subject', 
  'zendesk.status', 
  'zendesk.priority',
  'zendesk.assignee', 
  'zendesk.created_at'
];

// System configurations
export const SYSTEM_CONFIGS = [
  { id: 1, name: 'Zendesk', type: 'support', status: 'not_connected', color: 'bg-gray-400' },
  { id: 2, name: 'Jira', type: 'project', status: 'not_connected', color: 'bg-gray-400' },
  { id: 3, name: 'Slack', type: 'communication', status: 'not_connected', color: 'bg-gray-400' },
  { id: 4, name: 'GitHub', type: 'development', status: 'not_connected', color: 'bg-gray-400' },
  { id: 5, name: 'Salesforce', type: 'crm', status: 'not_connected', color: 'bg-gray-400' },
  { id: 6, name: 'Teams', type: 'communication', status: 'not_connected', color: 'bg-gray-400' }
];

// Field mapping configurations
export const DEFAULT_FIELD_MAPPINGS = [
  { 
    id: 1, 
    system1: 'Zendesk', 
    field1: 'jira_id', 
    system2: 'Jira', 
    field2: 'id', 
    active: true, 
    name: 'Zendesk-Jira Escalation' 
  }
];