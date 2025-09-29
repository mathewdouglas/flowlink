"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Settings, ExternalLink, RefreshCw, Filter, Search, AlertCircle, CheckCircle, Clock, X, Link, Edit3, Eye, EyeOff, ArrowRight, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useAllFlowRecords, useDashboardConfig } from '../hooks/useFlowLink';
import { useRecordLinks, useFieldMappings } from '../hooks/useRecordLinking';
import { useLinkedRecords } from '../hooks/useLinkedRecords';
import { useCustomColumns } from '../hooks/useCustomColumns';
import ZendeskSetupForm from './ZendeskSetupForm';
import CustomColumnForm from './CustomColumnForm';
import AnalyticsCharts from './AnalyticsCharts';
import RecordTable from './RecordTable';
import ColumnManager from './ColumnManager';
import SystemStatus from './SystemStatus';
import FilterControls from './FilterControls';
import { truncateText } from '../utils/textUtils';
import { getRecordFieldValue, getCustomFields, getCellRecordForColumn } from '../utils/recordFieldUtils';
import { getSystemColor, getPriorityColor, getStatusColor } from '../utils/styleUtils';
import { sortRecords, processRecordsWithLinks } from '../utils/dataUtils';
import { CURRENT_USER_ID, CURRENT_ORG_ID, DEFAULT_COLUMNS, SYSTEM_CONFIGS, DEFAULT_FIELD_MAPPINGS } from '../constants/appConstants';

const SystemIntegrationDashboard = () => {
  // Helper function to navigate to Zendesk tickets
  const navigateToZendeskTickets = () => {
    window.location.href = '/zendesk-tickets';
  };

  // Helper function to navigate to Jira issues
  const navigateToJiraIssues = () => {
    window.location.href = '/jira-issues';
  };
  
  // Zendesk setup modal state
  const [showZendeskSetup, setShowZendeskSetup] = useState(false);
  const [zendeskSubdomain, setZendeskSubdomain] = useState('');
  const [zendeskEmail, setZendeskEmail] = useState('');
  const [zendeskApiKey, setZendeskApiKey] = useState('');
  const [zendeskSaveStatus, setZendeskSaveStatus] = useState('idle'); // idle | saving | success | error

  // Save Zendesk credentials via API
  const handleZendeskSave = async (e) => {
    e.preventDefault();
    setZendeskSaveStatus('saving');
    try {
      const res = await fetch('/api/zendesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: zendeskSubdomain, email: zendeskEmail, apiKey: zendeskApiKey })
      });
      
      if (res.ok) {
        const data = await res.json();
        setZendeskSaveStatus('success');
        
        // If custom fields were returned, auto-populate display names
        if (data.customFields && data.customFields.length > 0) {
          const newDisplayNames = { ...columnDisplayNames };
          
          data.customFields.forEach(field => {
            // Only set display name if it's not already set
            if (!newDisplayNames[field.key]) {
              newDisplayNames[field.key] = field.title;
            }
          });
          
          // Save the updated display names if any were added
          if (Object.keys(newDisplayNames).length > Object.keys(columnDisplayNames).length) {
            setColumnDisplayNames(newDisplayNames);
            // Defer the autoSaveConfig call to avoid render issues
            setTimeout(() => {
              autoSaveConfig(visibleColumns, columnOrder, newDisplayNames, graphsExpanded);
            }, 0);
          }
        }
        
        setTimeout(() => setShowZendeskSetup(false), 1200);
        // Re-check connection after saving
        setTimeout(() => {
          checkZendeskConnection();
        }, 1300);
      } else {
        setZendeskSaveStatus('error');
      }
    } catch {
      setZendeskSaveStatus('error');
    }
  };

  // Database hooks for real data
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [availableZendeskFields, setAvailableZendeskFields] = useState([]); // Store Zendesk custom field definitions
  
  // Use linked records instead of individual records
  const { linkedRecords: linkedRecordsData, stats: linkedStats, isLoading: isLinkedLoading, mutate: mutateLinked } = useLinkedRecords(CURRENT_ORG_ID);
  
  // Keep the old hook for backward compatibility during development
  const { records: individualRecords, pagination, isLoading: isIndividualLoading, mutate } = useAllFlowRecords(CURRENT_ORG_ID, selectedSystem);
  
  // Use linked records by default, fallback to individual records if needed
  const shouldUseLinkedRecords = linkedRecordsData.length > 0;
  
  // Transform linked records data to match the expected structure for the table
  const processLinkedRecordsData = (linkedRecordsData) => {
    if (!Array.isArray(linkedRecordsData)) {
      console.warn('linkedRecordsData is not an array:', linkedRecordsData);
      return [];
    }
    
    return linkedRecordsData.map(linkedRecord => {
      // Add null checks to prevent runtime errors
      if (!linkedRecord || !linkedRecord.records) {
        console.warn('Invalid linkedRecord structure:', linkedRecord);
        return null;
      }
      
      // Check if this is a linked pair by looking at isUnlinked flag and records count
      const isLinkedPair = linkedRecord.isUnlinked === false && 
                          linkedRecord.records && 
                          Object.keys(linkedRecord.records).length > 1;
      
      if (isLinkedPair) {
        // This is a linked pair - create a combined record
        const systems = Object.keys(linkedRecord.records);
        // Use the sourceSystem as the primary system
        const primarySystem = linkedRecord.sourceSystem;
        const primaryRecord = linkedRecord.records[primarySystem];
        
        if (!primaryRecord) {
          console.warn('Primary record not found for system:', primarySystem);
          return null;
        }
        
        // Get all other systems for linkedRecords array
        const otherSystems = systems.filter(system => system !== primarySystem);
        
        const result = {
          ...primaryRecord,
          id: linkedRecord.id,
          isLinkedPair: true,
          linkedRecords: otherSystems.map(system => linkedRecord.records[system]),
          hasLinks: true,
          combinedData: linkedRecord.combinedData,
          mappingName: linkedRecord.mappingName,
          sourceSystem: linkedRecord.sourceSystem,
          targetSystem: linkedRecord.targetSystem,
          linkedField: linkedRecord.linkedField,
          linkedValue: linkedRecord.linkedValue,
          isUnlinked: false,
          // Preserve the original records structure for getCellRecordForColumn
          records: linkedRecord.records
        };
        
        // Debug the transformation
        console.log(`DEBUG processLinkedRecordsData (LINKED):`, {
          linkedRecordId: linkedRecord.id,
          isUnlinked: linkedRecord.isUnlinked,
          systems,
          primarySystem,
          resultIsLinkedPair: result.isLinkedPair,
          resultHasLinks: result.hasLinks,
          resultIsUnlinked: result.isUnlinked,
          linkedRecordsLength: result.linkedRecords.length
        });
        
        return result;
      } else {
        // This is an individual record - keep as is
        const systems = Object.keys(linkedRecord.records);
        if (systems.length === 0) {
          console.warn('No systems found in linkedRecord.records:', linkedRecord);
          return null;
        }
        
        const singleSystem = systems[0];
        const individualRecord = linkedRecord.records[singleSystem];
        
        if (!individualRecord) {
          console.warn('Individual record not found for system:', singleSystem);
          return null;
        }
        
        const result = {
          ...individualRecord,
          id: linkedRecord.id,
          isLinkedPair: false,
          linkedRecords: [],
          hasLinks: false,
          isUnlinked: linkedRecord.isUnlinked,
          // Preserve the records structure for consistency
          records: linkedRecord.records
        };
        
        // Debug the transformation
        console.log(`DEBUG processLinkedRecordsData (UNLINKED):`, {
          linkedRecordId: linkedRecord.id,
          isUnlinked: linkedRecord.isUnlinked,
          resultIsLinkedPair: result.isLinkedPair,
          resultHasLinks: result.hasLinks,
          resultIsUnlinked: result.isUnlinked
        });
        
        return result;
      }
    }).filter(Boolean); // Remove null/undefined entries
  };
  
  const records = useMemo(() => {
    return shouldUseLinkedRecords ? processLinkedRecordsData(linkedRecordsData || []) : (individualRecords || []);
  }, [shouldUseLinkedRecords, linkedRecordsData, individualRecords]);
  const isLoading = isLinkedLoading || isIndividualLoading;

  // Debug: Log what types of records we're working with
  console.log('DEBUG records being processed:', records.slice(0, 3).map(r => ({
    id: r.id,
    sourceSystem: r.sourceSystem,
    isLinkedPair: r.isLinkedPair,
    hasLinks: r.hasLinks,
    linkedRecordsCount: r.linkedRecords ? r.linkedRecords.length : 0,
    linkedRecordSystems: r.linkedRecords ? r.linkedRecords.map(lr => lr.sourceSystem) : []
  })));
  
  // Check if we actually have linked pairs (not just individual records from the API)
  const hasActualLinkedPairs = shouldUseLinkedRecords && 
    Array.isArray(linkedRecordsData) && 
    linkedRecordsData.some(record => record && record.records && Object.keys(record.records).length > 1);
  
  const { config, saveConfig } = useDashboardConfig(CURRENT_USER_ID, CURRENT_ORG_ID);
  
  // Ref to track if autoSaveConfig is currently running
  const autoSaveRunningRef = useRef(false);
  
  // Linking hooks with fallback empty arrays
  const { links = [], createLink, deleteLink } = useRecordLinks(CURRENT_ORG_ID) || {};
  const { mappings = [], createMapping, updateMapping, deleteMapping } = useFieldMappings(CURRENT_ORG_ID) || {};
  
  // Custom columns hook
  const { 
    customColumns = [], 
    createColumn, 
    updateColumn, 
    deleteColumn, 
    updateRecordCustomFields 
  } = useCustomColumns(CURRENT_ORG_ID);

  const [connectedSystems, setConnectedSystems] = useState(SYSTEM_CONFIGS);

  // Helper to update a system's status and color
  const updateSystemStatus = (systemName, status) => {
    setConnectedSystems(prev => prev.map(sys => {
      if (sys.name.toLowerCase() === systemName.toLowerCase()) {
        let color = 'bg-gray-400';
        if (status === 'connected') color = 'bg-green-500';
        else if (status === 'error') color = 'bg-red-500';
        else if (status === 'pending') color = 'bg-yellow-400';
        return { ...sys, status, color };
      }
      return sys;
    }));
  };

  // Fetch Zendesk custom fields for better column naming
  const fetchZendeskCustomFields = useCallback(async () => {
    try {
      const credentialsRes = await fetch('/api/zendesk/credentials');
      if (!credentialsRes.ok) return;
      
      const credentials = await credentialsRes.json();
      if (!credentials.configured) return;

      const customFieldsRes = await fetch(
        `/api/zendesk/custom-fields?subdomain=${credentials.subdomain}&email=${encodeURIComponent(credentials.email)}&apiKey=${encodeURIComponent(credentials.apiKey)}`
      );
      
      if (customFieldsRes.ok) {
        const customFieldsData = await customFieldsRes.json();
        setAvailableZendeskFields(customFieldsData.customFields || []);
      }
    } catch (error) {
      console.warn('Failed to fetch Zendesk custom fields:', error);
    }
  }, []);

  // Check Zendesk connection status
  const checkZendeskConnection = useCallback(async () => {
    updateSystemStatus('Zendesk', 'pending');
    try {
      const res = await fetch('/api/zendesk/status');
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          updateSystemStatus('Zendesk', 'connected');
          // Fetch custom fields when connected
          fetchZendeskCustomFields();
        } else {
          updateSystemStatus('Zendesk', data.status === 'not_configured' ? 'not connected' : 'error');
        }
      } else {
        updateSystemStatus('Zendesk', 'error');
      }
    } catch {
      updateSystemStatus('Zendesk', 'error');
    }
  }, [fetchZendeskCustomFields]);

  // Check connection status on mount
  useEffect(() => {
    checkZendeskConnection();
  }, [checkZendeskConnection]);

  // Memoize custom column keys to prevent infinite re-renders
  const customColumnKeys = useMemo(() => {
    return customColumns.map(col => `custom.${col.name}`);
  }, [customColumns]);

  // Local state for managing column configuration - use arrays instead of objects for consistency
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnDisplayNames, setColumnDisplayNames] = useState({});
  const [graphsExpanded, setGraphsExpanded] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Update local state when config loads
  useEffect(() => {
    if (config) {
      setVisibleColumns(config.visibleColumns || []);
      setColumnOrder(config.columnOrder || []);
      setColumnDisplayNames(config.columnDisplayNames || {});
      setGraphsExpanded(config.graphsExpanded !== false); // Default to true if not set
      setHasInitialized(true);
      
      // Load filter state from config
      if (config.filters) {
        setFilterSystem(config.filters.filterSystem || 'all');
        setFilterStatusColumn(config.filters.filterStatusColumn || 'all');
        setFilterStatusValue(config.filters.filterStatusValue || 'all');
        setHideSolvedTickets(config.filters.hideSolvedTickets || false);
      }
    } else if (!hasInitialized) {
      // Set default visible columns based on whether we have linked records (only once)
      let defaultColumns = DEFAULT_COLUMNS;
      
      if (shouldUseLinkedRecords && hasActualLinkedPairs) {
        // Add linked record columns to default view
        const linkedColumns = [
          'mappingName',
          'linkedField', 
          'linkedValue',
          'zendesk_id',
          'zendesk_subject',
          'zendesk_status',
          'jira_id',
          'jira_subject', 
          'jira_status'
        ];
        defaultColumns = [...linkedColumns];
      }
      
      // Always include custom columns in default view if they exist
      defaultColumns = [...defaultColumns, ...customColumnKeys];
      
      setVisibleColumns(defaultColumns);
      setColumnOrder(defaultColumns);
      setColumnDisplayNames({});
      setGraphsExpanded(true); // Default to expanded
      setHasInitialized(true);
    }
  }, [config, shouldUseLinkedRecords, hasActualLinkedPairs, customColumnKeys, hasInitialized]);

  // Filter state declarations (must be before autoSaveConfig)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSystem, setFilterSystem] = useState('all');
  const [filterStatusColumn, setFilterStatusColumn] = useState('all');
  const [filterStatusValue, setFilterStatusValue] = useState('all');
  const [hideSolvedTickets, setHideSolvedTickets] = useState(false);

  // Auto-save configuration when columns change with debouncing
  const autoSaveConfig = useCallback(async (columns, order, displayNames, expanded, showStatus = true, filterOverrides = {}) => {
    // Prevent multiple simultaneous saves
    if (autoSaveRunningRef.current) {
      return;
    }
    
    try {
      autoSaveRunningRef.current = true;
      if (showStatus) setConfigSaveStatus('saving');
      await saveConfig({
        visibleColumns: columns,
        columnOrder: order,
        columnDisplayNames: displayNames,
        graphsExpanded: expanded !== undefined ? expanded : true,
        filters: {
          filterSystem: filterOverrides.filterSystem !== undefined ? filterOverrides.filterSystem : filterSystem,
          filterStatusColumn: filterOverrides.filterStatusColumn !== undefined ? filterOverrides.filterStatusColumn : filterStatusColumn,
          filterStatusValue: filterOverrides.filterStatusValue !== undefined ? filterOverrides.filterStatusValue : filterStatusValue,
          hideSolvedTickets: filterOverrides.hideSolvedTickets !== undefined ? filterOverrides.hideSolvedTickets : hideSolvedTickets
        }
      });
      if (showStatus) {
        setConfigSaveStatus('saved');
        // Clear the saved status after 2 seconds
        setTimeout(() => setConfigSaveStatus(''), 2000);
      }
    } catch (error) {
      console.error('Failed to auto-save configuration:', error);
      if (showStatus) {
        setConfigSaveStatus('error');
        setTimeout(() => setConfigSaveStatus(''), 3000);
      }
    } finally {
      autoSaveRunningRef.current = false;
    }
  }, [saveConfig, filterSystem, filterStatusColumn, filterStatusValue, hideSolvedTickets]);

  // Field mapping and linking configuration (keep for future enhancement)
  const [fieldMappings, setFieldMappings] = useState(DEFAULT_FIELD_MAPPINGS);

  // Column metadata with display names, types, and order
  const columnMetadata = useMemo(() => ({
    // Zendesk columns based on actual API response fields
    'zendesk.id': { label: 'Ticket ID', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.subject': { label: 'Subject', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.description': { label: 'Description', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.status': { label: 'Status', color: 'green', group: 'zendesk', type: 'badge' },
    'zendesk.priority': { label: 'Priority', color: 'green', group: 'zendesk', type: 'badge' },
    'zendesk.assignee': { label: 'Assignee', color: 'green', group: 'zendesk', type: 'user' },
    'zendesk.requester': { label: 'Requester', color: 'green', group: 'zendesk', type: 'user' },
    'zendesk.created_at': { label: 'Created', color: 'green', group: 'zendesk', type: 'date' },
    'zendesk.updated_at': { label: 'Updated', color: 'green', group: 'zendesk', type: 'date' },
    'zendesk.tags': { label: 'Tags', color: 'green', group: 'zendesk', type: 'tags' },
    
    // Additional Zendesk fields available from customFields
    'zendesk.channel': { label: 'Channel', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.satisfaction_rating': { label: 'Satisfaction', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.ticket_form_id': { label: 'Form ID', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.brand_id': { label: 'Brand ID', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.group_id': { label: 'Group ID', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.organization_id': { label: 'Org ID', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.problem_id': { label: 'Problem ID', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.has_incidents': { label: 'Has Incidents', color: 'green', group: 'zendesk', type: 'badge' },
    'zendesk.is_public': { label: 'Is Public', color: 'green', group: 'zendesk', type: 'badge' },
    'zendesk.due_at': { label: 'Due Date', color: 'green', group: 'zendesk', type: 'date' },

    'jira.key': { label: 'Issue Key', color: 'blue', group: 'jira', type: 'text' },
    'jira.summary': { label: 'Summary', color: 'blue', group: 'jira', type: 'text' },
    'jira.priority': { label: 'Priority', color: 'blue', group: 'jira', type: 'badge' },
    'jira.status': { label: 'Status', color: 'blue', group: 'jira', type: 'badge' },
    'jira.assignee': { label: 'Assignee', color: 'blue', group: 'jira', type: 'user' },
    'jira.reporter': { label: 'Reporter', color: 'blue', group: 'jira', type: 'user' },
    'jira.issue_type': { label: 'Issue Type', color: 'blue', group: 'jira', type: 'badge' },
    'jira.project': { label: 'Project', color: 'blue', group: 'jira', type: 'text' },
    'jira.created': { label: 'Created', color: 'blue', group: 'jira', type: 'date' },
    'jira.updated': { label: 'Updated', color: 'blue', group: 'jira', type: 'date' },
    'jira.story_points': { label: 'Story Points', color: 'blue', group: 'jira', type: 'number' },
    'jira.sprint': { label: 'Sprint', color: 'blue', group: 'jira', type: 'text' },

    'slack.message_id': { label: 'Message ID', color: 'red', group: 'slack', type: 'text' },
    'slack.channel': { label: 'Channel', color: 'red', group: 'slack', type: 'text' },
    'slack.user': { label: 'User', color: 'red', group: 'slack', type: 'user' },
    'slack.text': { label: 'Message', color: 'red', group: 'slack', type: 'text' },
    'slack.timestamp': { label: 'Timestamp', color: 'red', group: 'slack', type: 'date' },
    'slack.thread_ts': { label: 'Thread', color: 'red', group: 'slack', type: 'text' },

    'github.number': { label: 'Issue #', color: 'gray', group: 'github', type: 'text' },
    'github.title': { label: 'Title', color: 'gray', group: 'github', type: 'text' },
    'github.state': { label: 'State', color: 'gray', group: 'github', type: 'badge' },
    'github.assignee': { label: 'Assignee', color: 'gray', group: 'github', type: 'user' },
    'github.author': { label: 'Author', color: 'gray', group: 'github', type: 'user' },
    'github.labels': { label: 'Labels', color: 'gray', group: 'github', type: 'tags' },
    'github.milestone': { label: 'Milestone', color: 'gray', group: 'github', type: 'text' },
    'github.created_at': { label: 'Created', color: 'gray', group: 'github', type: 'date' },

    'salesforce.case_number': { label: 'Case Number', color: 'blue', group: 'salesforce', type: 'text' },
    'salesforce.subject': { label: 'Subject', color: 'blue', group: 'salesforce', type: 'text' },
    'salesforce.status': { label: 'Status', color: 'blue', group: 'salesforce', type: 'badge' },
    'salesforce.priority': { label: 'Priority', color: 'blue', group: 'salesforce', type: 'badge' },
    'salesforce.owner': { label: 'Owner', color: 'blue', group: 'salesforce', type: 'user' },
    'salesforce.account': { label: 'Account', color: 'blue', group: 'salesforce', type: 'text' },

    'teams.message_id': { label: 'Message ID', color: 'purple', group: 'teams', type: 'text' },
    'teams.channel': { label: 'Channel', color: 'purple', group: 'teams', type: 'text' },
    'teams.from': { label: 'From', color: 'purple', group: 'teams', type: 'user' },
    'teams.subject': { label: 'Subject', color: 'purple', group: 'teams', type: 'text' },
    'teams.created_datetime': { label: 'Created', color: 'purple', group: 'teams', type: 'date' }
  }), []);

  // Get current column metadata (including custom columns)
  const currentColumnMetadata = useMemo(() => {
    // Apply display names to system columns
    const systemColumns = {};
    Object.keys(columnMetadata).forEach(key => {
      systemColumns[key] = {
        ...columnMetadata[key],
        label: columnDisplayNames[key] || columnMetadata[key].label
      };
    });

    // Add linked record columns for different system combinations
    if (hasActualLinkedPairs) {
      // Dynamically add columns based on active mappings
      const activeMappings = linkedRecordsData
        .filter(record => record.mappingId && !record.isUnlinked)
        .map(record => ({ sourceSystem: record.sourceSystem, targetSystem: record.targetSystem }))
        .filter((mapping, index, self) => 
          self.findIndex(m => m.sourceSystem === mapping.sourceSystem && m.targetSystem === mapping.targetSystem) === index
        );

      activeMappings.forEach(mapping => {
        // Add columns for each system in the mapping
        systemColumns[`${mapping.sourceSystem}_id`] = {
          label: `${mapping.sourceSystem.charAt(0).toUpperCase() + mapping.sourceSystem.slice(1)} ID`,
          color: 'blue',
          group: 'linked',
          type: 'string'
        };
        
        systemColumns[`${mapping.targetSystem}_id`] = {
          label: `${mapping.targetSystem.charAt(0).toUpperCase() + mapping.targetSystem.slice(1)} ID`,
          color: 'green',
          group: 'linked',
          type: 'string'
        };
        
        systemColumns[`${mapping.sourceSystem}_subject`] = {
          label: `${mapping.sourceSystem.charAt(0).toUpperCase() + mapping.sourceSystem.slice(1)} Subject`,
          color: 'blue',
          group: 'linked',
          type: 'string'
        };
        
        systemColumns[`${mapping.targetSystem}_subject`] = {
          label: `${mapping.targetSystem.charAt(0).toUpperCase() + mapping.targetSystem.slice(1)} Subject`,
          color: 'green',
          group: 'linked',
          type: 'string'
        };
        
        systemColumns[`${mapping.sourceSystem}_status`] = {
          label: `${mapping.sourceSystem.charAt(0).toUpperCase() + mapping.sourceSystem.slice(1)} Status`,
          color: 'blue',
          group: 'linked',
          type: 'string'
        };
        
        systemColumns[`${mapping.targetSystem}_status`] = {
          label: `${mapping.targetSystem.charAt(0).toUpperCase() + mapping.targetSystem.slice(1)} Status`,
          color: 'green',
          group: 'linked',
          type: 'string'
        };
      });
      
      // Add linking info columns
      systemColumns['linkedField'] = {
        label: 'Linked Field',
        color: 'purple',
        group: 'linked',
        type: 'string'
      };
      
      systemColumns['linkedValue'] = {
        label: 'Linked Value',
        color: 'purple',
        group: 'linked',
        type: 'string'
      };
      
      systemColumns['mappingName'] = {
        label: 'Mapping',
        color: 'purple',
        group: 'linked',
        type: 'string'
      };
    }

    // Add custom columns
    const customColumnMetadata = {};
    customColumns.forEach(column => {
      customColumnMetadata[`custom.${column.name}`] = {
        label: columnDisplayNames[`custom.${column.name}`] || column.label,
        color: 'indigo', // Use indigo for custom columns
        group: 'custom',
        type: column.type,
        isCustom: true,
        customColumn: column
      };
    });

    // Add Zendesk custom fields (extracted from records)
    const zendeskCustomFieldMetadata = {};
    const zendeskCustomFieldIds = new Set();

    // Collect unique Zendesk custom field IDs from records
    records.forEach(record => {
      // Handle both linked records and individual records
      let zendeskRecord = null;
      
      if (record.isLinkedPair && record.records && record.records.zendesk) {
        // This is a linked record - get the Zendesk record from the nested structure
        zendeskRecord = record.records.zendesk;
      } else if (record.sourceSystem === 'zendesk') {
        // This is an individual Zendesk record
        zendeskRecord = record;
      }
      
      if (zendeskRecord && zendeskRecord.customFields) {
        try {
          // Handle both string and object formats for customFields
          let customFields = zendeskRecord.customFields;
          if (typeof customFields === 'string') {
            customFields = JSON.parse(customFields);
          }
          
          // Find numeric keys (Zendesk custom field IDs)
          Object.keys(customFields).forEach(key => {
            if (/^\d+$/.test(key)) { // Only numeric keys
              zendeskCustomFieldIds.add(key);
            }
          });
        } catch (error) {
          console.warn('Error parsing Zendesk custom fields:', error, zendeskRecord.customFields);
          // Ignore parsing errors
        }
      }
    });

    // Also include all available Zendesk custom fields from API (not just those with data)
    availableZendeskFields.forEach(field => {
      zendeskCustomFieldIds.add(field.id.toString());
    });

    // Add Zendesk custom fields to metadata (limit to reasonable number and filter out unused ones)
    const commonlyUsedFields = Array.from(zendeskCustomFieldIds)
      .slice(0, 100) // Increased limit since we want to show all available fields
      .filter(fieldId => {
        // Include fields that have actual values in the data OR are available in the API
        const hasApiDefinition = availableZendeskFields.some(field => field.id.toString() === fieldId);
        if (hasApiDefinition) return true; // Always include fields we have definitions for
        
        // Otherwise, check if field has values in records
        let hasValue = false;
        for (const record of records) {
          let zendeskRecord = null;
          
          if (record.isLinkedPair && record.records && record.records.zendesk) {
            zendeskRecord = record.records.zendesk;
          } else if (record.sourceSystem === 'zendesk') {
            zendeskRecord = record;
          }
          
          if (zendeskRecord && zendeskRecord.customFields) {
            try {
              let customFields = zendeskRecord.customFields;
              if (typeof customFields === 'string') {
                customFields = JSON.parse(customFields);
              }
              
              const value = customFields[fieldId];
              // Include fields that have any value, including false, 0, empty string - only exclude null/undefined
              if (value !== null && value !== undefined) {
                hasValue = true;
                break;
              }
            } catch (error) {
              // Ignore parsing errors
            }
          }
        }
        return hasValue;
      });
      
    commonlyUsedFields.forEach(fieldId => {
      // Determine if this field should be treated as boolean by checking values
      let isBooleanField = false;
      const seenValues = new Set();
      
      records.forEach(record => {
        // Handle both linked records and individual records
        let zendeskRecord = null;
        
        if (record.isLinkedPair && record.records && record.records.zendesk) {
          // This is a linked record - get the Zendesk record from the nested structure
          zendeskRecord = record.records.zendesk;
        } else if (record.sourceSystem === 'zendesk') {
          // This is an individual Zendesk record
          zendeskRecord = record;
        }
        
        if (zendeskRecord && zendeskRecord.customFields) {
          try {
            // Handle both string and object formats for customFields
            let customFields = zendeskRecord.customFields;
            if (typeof customFields === 'string') {
              customFields = JSON.parse(customFields);
            }
            
            const value = customFields[fieldId];
            if (value !== null && value !== undefined && value !== '') {
              seenValues.add(value);
            }
          } catch (error) {
            console.warn('Error parsing custom fields for field', fieldId, ':', error);
            // Ignore parsing errors
          }
        }
      });
      
      // If all non-null values are boolean, treat as boolean field
      if (seenValues.size > 0) {
        const allBoolean = Array.from(seenValues).every(value => typeof value === 'boolean');
        if (allBoolean) {
          isBooleanField = true;
        }
      }
      
      // Get field name from Zendesk API data if available
      const zendeskFieldData = availableZendeskFields.find(field => field.id.toString() === fieldId);
      const fieldLabel = columnDisplayNames[`zendesk.custom_${fieldId}`] || 
                        (zendeskFieldData ? zendeskFieldData.title : `Custom Field ${fieldId}`);
      
      zendeskCustomFieldMetadata[`zendesk.custom_${fieldId}`] = {
        label: fieldLabel,
        color: 'green',
        group: 'zendesk',
        type: isBooleanField ? 'boolean' : 'text',
        isZendeskCustom: true,
        fieldId: fieldId,
        zendeskFieldData: zendeskFieldData // Store the API data for reference
      };
    });

    return { ...systemColumns, ...customColumnMetadata, ...zendeskCustomFieldMetadata };
  }, [records, customColumns, columnMetadata, columnDisplayNames, linkedRecordsData, hasActualLinkedPairs, availableZendeskFields]);

  // Drag and drop state
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [expandedSystems, setExpandedSystems] = useState({
    custom: false,
    zendesk: false,
    jira: false,
    slack: false,
    github: false,
    salesforce: false,
    teams: false
  });

  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showCustomColumnForm, setShowCustomColumnForm] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [editingDisplayName, setEditingDisplayName] = useState(null); // { columnKey, currentName }
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSystemsExpanded, setIsSystemsExpanded] = useState(true);
  const [configSaveStatus, setConfigSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const [showConnectedSystems, setShowConnectedSystems] = useState(false);

  // Handle graphs toggle with auto-save
  const handleGraphsToggle = useCallback(() => {
    const newExpanded = !graphsExpanded;
    setGraphsExpanded(newExpanded);
    autoSaveConfig(visibleColumns, columnOrder, columnDisplayNames, newExpanded, false);
  }, [graphsExpanded, visibleColumns, columnOrder, columnDisplayNames, autoSaveConfig]);

  // Handle filter changes with auto-save
  const handleFilterSystemChange = useCallback((newFilterSystem) => {
    setFilterSystem(newFilterSystem);
    // Auto-save filters with a slight delay to batch rapid changes
    setTimeout(() => {
      autoSaveConfig(visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, false, { filterSystem: newFilterSystem });
    }, 100);
  }, [visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, autoSaveConfig]);

  const handleFilterStatusColumnChange = useCallback((newFilterStatusColumn) => {
    setFilterStatusColumn(newFilterStatusColumn);
    setFilterStatusValue('all'); // Reset status value when column changes
    setTimeout(() => {
      autoSaveConfig(visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, false, { 
        filterStatusColumn: newFilterStatusColumn, 
        filterStatusValue: 'all' 
      });
    }, 100);
  }, [visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, autoSaveConfig]);

  const handleFilterStatusValueChange = useCallback((newFilterStatusValue) => {
    setFilterStatusValue(newFilterStatusValue);
    setTimeout(() => {
      autoSaveConfig(visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, false, { filterStatusValue: newFilterStatusValue });
    }, 100);
  }, [visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, autoSaveConfig]);

  const handleHideSolvedTicketsChange = useCallback((newHideSolvedTickets) => {
    setHideSolvedTickets(newHideSolvedTickets);
    setTimeout(() => {
      autoSaveConfig(visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, false, { hideSolvedTickets: newHideSolvedTickets });
    }, 100);
  }, [visibleColumns, columnOrder, columnDisplayNames, graphsExpanded, autoSaveConfig]);

  // Integration status state
  const [integrationStatuses, setIntegrationStatuses] = useState({
    zendesk: { status: 'checking', connected: false },
    jira: { status: 'checking', connected: false },
    slack: { status: 'checking', connected: false },
    github: { status: 'checking', connected: false },
    salesforce: { status: 'checking', connected: false },
    teams: { status: 'checking', connected: false }
  });

  const checkAllIntegrationStatuses = useCallback(async () => {
    // Only check status for systems that have status APIs implemented
    const systemsWithStatusAPIs = ['zendesk', 'jira'];
    
    // Set default status for all systems
    setIntegrationStatuses({
      zendesk: { status: 'checking', connected: false },
      jira: { status: 'checking', connected: false },
      slack: { status: 'not_configured', connected: false, message: 'Not implemented yet' },
      github: { status: 'not_configured', connected: false, message: 'Not implemented yet' },
      salesforce: { status: 'not_configured', connected: false, message: 'Not implemented yet' },
      teams: { status: 'not_configured', connected: false, message: 'Not implemented yet' }
    });
    
    // Check status for systems with APIs
    for (const system of systemsWithStatusAPIs) {
      try {
        const response = await fetch(`/api/${system}/status`);
        if (response.ok) {
          const data = await response.json();
          const status = data.connected ? 'connected' : 'not_configured';
          setIntegrationStatuses(prev => ({
            ...prev,
            [system]: {
              status: status,
              connected: data.connected,
              message: data.message
            }
          }));
          // Update the visual system status as well
          updateSystemStatus(system === 'zendesk' ? 'Zendesk' : 'Jira', status);
        } else {
          setIntegrationStatuses(prev => ({
            ...prev,
            [system]: { status: 'error', connected: false, message: 'Failed to check status' }
          }));
          // Update the visual system status as well
          updateSystemStatus(system === 'zendesk' ? 'Zendesk' : 'Jira', 'error');
        }
      } catch (error) {
        setIntegrationStatuses(prev => ({
          ...prev,
          [system]: { status: 'error', connected: false, message: 'Network error' }
        }));
        // Update the visual system status as well
        updateSystemStatus(system === 'zendesk' ? 'Zendesk' : 'Jira', 'error');
      }
    }
  }, []);

  // Check integration status when connections modal opens
  useEffect(() => {
    if (showConnectedSystems) {
      checkAllIntegrationStatuses();
    }
  }, [showConnectedSystems, checkAllIntegrationStatuses]);

  const navigateToTickets = (system) => {
    if (system === 'zendesk') {
      navigateToZendeskTickets();
    } else if (system === 'jira') {
      navigateToJiraIssues();
    } else {
      // For now, just filter the dashboard to show records from this system
      setSelectedSystem(system);
    }
    setShowConnectedSystems(false);
  };

  // Sorting state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Helper function to get sort indicator icon
  const getSortIndicator = (columnKey) => {
    if (sortColumn !== columnKey) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 inline ml-1" /> : <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  // Inline editing state for custom columns
  const [editingCell, setEditingCell] = useState(null); // { recordId, fieldName }
  const [editingValue, setEditingValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Filter and search records using real database data
  const filteredRecords = records.filter(record => {
    // Search filter
    const matchesSearch = !searchTerm || 
      record.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.sourceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assigneeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assigneeEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reporterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reporterEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter  
    const matchesStatus = filterStatusColumn === 'all' || filterStatusValue === 'all' || (() => {
      const [system, field] = filterStatusColumn.split('.');
      const columnMeta = currentColumnMetadata[filterStatusColumn];
      const isBooleanColumn = columnMeta && columnMeta.type === 'boolean';
      
      let recordStatus;
      if (system === record.sourceSystem || system === 'custom') {
        recordStatus = getRecordFieldValue(record, field);
      } else {
        // Check linked records using the same logic as getAvailableStatusValues
        const safeLinks = Array.isArray(links) ? links : [];
        const relevantLink = safeLinks.find(link => 
          (link.sourceRecordId === record.id && link.targetRecord?.sourceSystem === system) ||
          (link.targetRecordId === record.id && link.sourceRecord?.sourceSystem === system)
        );
        
        if (relevantLink) {
          const linkedRecord = relevantLink.sourceRecordId === record.id 
            ? relevantLink.targetRecord 
            : relevantLink.sourceRecord;
          if (linkedRecord) {
            recordStatus = getRecordFieldValue(linkedRecord, field);
          }
        }
      }
      
      // For boolean columns, treat undefined/null as false
      if (isBooleanColumn && filterStatusValue === 'false') {
        return recordStatus === false || recordStatus === null || recordStatus === undefined;
      }
      
      return String(recordStatus)?.toLowerCase() === filterStatusValue.toLowerCase();
    })();

    // Linked/Unlinked filter
    const matchesLinkStatus = filterSystem === 'all' || (() => {
      // Check if this record is linked - either it's a linked pair, has links, or is explicitly not marked as unlinked
      const isLinkedRecord = record.isLinkedPair || 
                            (record.hasLinks && record.linkedRecords && record.linkedRecords.length > 0) ||
                            (record.isUnlinked === false);
      
      if (filterSystem === 'linked') {
        return isLinkedRecord;
      } else if (filterSystem === 'unlinked') {
        // A record is unlinked if it's explicitly marked as unlinked OR if it has no links
        return record.isUnlinked === true || !isLinkedRecord;
      }
      return true;
    })();

    // Hide solved tickets filter
    const matchesSolvedFilter = !hideSolvedTickets || (() => {
      // Check if the record status indicates it's solved/closed
      const status = record.status?.toLowerCase() || '';
      const solvedStatuses = ['solved', 'closed', 'resolved', 'done', 'complete', 'completed'];
      return !solvedStatuses.includes(status);
    })();

    // System filter (handled by selectedSystem already)
    return matchesSearch && matchesStatus && matchesLinkStatus && matchesSolvedFilter;
  });

  // Sorting handler
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, start with ascending
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Get available filterable columns (status, state, and boolean columns)
  const getAvailableStatusColumns = () => {
    const statusColumns = [];

    // Add "All Statuses" option
    statusColumns.push({ key: 'all', label: 'All Status Columns' });

    // Check visible columns for status, state, and boolean fields
    getVisibleColumnsInOrder().forEach(columnKey => {
      const [system, field] = columnKey.split('.');
      const meta = currentColumnMetadata[columnKey];
      if (meta && (field === 'status' || field === 'state' || meta.type === 'boolean')) {
        statusColumns.push({
          key: columnKey,
          label: `${meta.label} (${system})`
        });
      }
    });

    return statusColumns;
  };

  // Get available status values for the selected column
  const getAvailableStatusValues = () => {
    if (filterStatusColumn === 'all') {
      return [{ key: 'all', label: 'All Statuses' }];
    }

    const statusValues = new Set();
    const [system, field] = filterStatusColumn.split('.');
    
    // Collect unique status values from records
    records.forEach(record => {
      let statusValue;
      
      if (system === record.sourceSystem || system === 'custom') {
        statusValue = getRecordFieldValue(record, field);
      } else {
        // Check if this record has a linked record from the target system
        const safeLinks = Array.isArray(links) ? links : [];
        const relevantLink = safeLinks.find(link => 
          (link.sourceRecordId === record.id && link.targetRecord?.sourceSystem === system) ||
          (link.targetRecordId === record.id && link.sourceRecord?.sourceSystem === system)
        );
        
        if (relevantLink) {
          const linkedRecord = relevantLink.sourceRecordId === record.id 
            ? relevantLink.targetRecord 
            : relevantLink.sourceRecord;
          if (linkedRecord) {
            statusValue = getRecordFieldValue(linkedRecord, field);
          }
        }
      }
      
      if (statusValue !== null && statusValue !== undefined && statusValue !== '-') {
        statusValues.add(statusValue);
      }
    });

    const values = [{ key: 'all', label: 'All Statuses' }];
    
    // For boolean columns, always include "false" since blank fields count as false
    const columnMeta = currentColumnMetadata[filterStatusColumn];
    if (columnMeta && columnMeta.type === 'boolean') {
      statusValues.add(false);
    }
    
    Array.from(statusValues).sort().forEach(value => {
      const stringValue = String(value);
      values.push({ key: stringValue, label: stringValue });
    });
    
    return values;
  };

  // Apply sorting to filtered records
  const sortedRecords = sortRecords(filteredRecords, sortColumn, sortDirection);

  // Create linked records structure similar to original dashboard
  const processedRecords = sortedRecords.map(record => {
    // If the record already has proper linking information from processLinkedRecordsData, preserve it
    if (record.isLinkedPair === true || record.isLinkedPair === false) {
      // This record was already processed by processLinkedRecordsData, keep its linking info
      console.log(`DEBUG processedRecords: Preserving link info for record ${record.id}: hasLinks=${record.hasLinks}, isLinkedPair=${record.isLinkedPair}`);
      return record;
    }
    
    // Fallback for records that weren't processed (shouldn't happen with new API)
    // Find all links where this record is either source or target - ensure links is always an array
    const safeLinks = Array.isArray(links) ? links : [];
    const recordLinks = safeLinks.filter(link => 
      link && link.sourceRecordId === record.id || link.targetRecordId === record.id
    );

    // Get linked records
    const linkedToRecords = recordLinks.map(link => {
      const linkedRecord = link.sourceRecordId === record.id 
        ? link.targetRecord 
        : link.sourceRecord;
      return {
        ...linkedRecord,
        linkType: link.linkType,
        linkName: link.linkName
      };
    });

    return {
      ...record,
      linkedRecords: linkedToRecords,
      hasLinks: linkedToRecords.length > 0
    };
  });

  // Apply link status sorting if needed
  const linkedRecords = sortColumn === 'linkStatus' 
    ? [...processedRecords].sort((a, b) => {
        const aValue = a.hasLinks ? 1 : 0;
        const bValue = b.hasLinks ? 1 : 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      })
    : processedRecords;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading records...</p>
        </div>
      </div>
    );
  }

  // Handle refresh with real data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh both data sources
      await Promise.all([
        mutate(), // Refresh individual records
        mutateLinked() // Refresh linked records
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  // Manual save configuration (for modal)
  const handleSaveConfig = async () => {
    try {
      await saveConfig({
        visibleColumns,
        columnOrder,
        filters: {} // Add filter state here when implemented
      });
      setShowColumnConfig(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const toggleColumnVisibility = (columnKey) => {
    let newVisibleColumns, newColumnOrder;
    
    if (visibleColumns.includes(columnKey)) {
      newVisibleColumns = visibleColumns.filter(key => key !== columnKey);
      setVisibleColumns(newVisibleColumns);
    } else {
      newVisibleColumns = [...visibleColumns, columnKey];
      setVisibleColumns(newVisibleColumns);
      
      if (!columnOrder.includes(columnKey)) {
        newColumnOrder = [...columnOrder, columnKey];
        setColumnOrder(newColumnOrder);
      } else {
        newColumnOrder = columnOrder;
      }
    }
    
    // Auto-save the configuration
    autoSaveConfig(newVisibleColumns, newColumnOrder || columnOrder, columnDisplayNames, graphsExpanded);
  };

  // Inline editing functions for custom columns
  const startEditing = (recordId, fieldName, currentValue, columnType) => {
    setEditingCell({ recordId, fieldName });
    
    // Convert display value back to actual value for editing
    if (columnType === 'boolean') {
      setEditingValue(currentValue === 'Yes' ? 'true' : currentValue === 'No' ? 'false' : currentValue);
    } else {
      setEditingValue(currentValue === '-' ? '' : String(currentValue));
    }
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const saveCustomFieldEdit = async (recordId, fieldName, value, columnType) => {
    setIsSavingEdit(true);
    
    try {
      // Convert value based on column type
      let processedValue = value;
      if (columnType === 'boolean') {
        processedValue = value === 'true' || value === true;
      } else if (columnType === 'number') {
        processedValue = value === '' ? null : Number(value);
      } else if (value === '') {
        processedValue = null;
      }

      console.log('Saving custom field:', { recordId, fieldName, value, processedValue, columnType });

      // Find the record to check if it's a linked pair
      const currentRecord = records.find(r => r.id === recordId);
      const isLinkedPair = currentRecord && currentRecord.isLinkedPair;
      
      if (isLinkedPair && currentRecord.records) {
        // For linked records, save to all individual records in the pair
        const updatePromises = [];
        
        currentRecord.records.forEach(individualRecord => {
          if (individualRecord && individualRecord.id) {
            updatePromises.push(
              fetch(`/api/records/${individualRecord.id}/custom-fields`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customFieldValues: {
                    [fieldName]: processedValue
                  }
                }),
              })
            );
          }
        });
        
        // Wait for all updates to complete
        const responses = await Promise.all(updatePromises);
        
        // Check if any failed
        for (const response of responses) {
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`Failed to save custom field: ${response.status} ${errorText}`);
          }
        }
        
        console.log(`Save successful for linked pair: updated ${responses.length} records`);
      } else {
        // For individual records, save to the single record
        const response = await fetch(`/api/records/${recordId}/custom-fields`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customFieldValues: {
              [fieldName]: processedValue
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          throw new Error(`Failed to save custom field: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Save successful:', result);
      }

      // Clear editing state first
      cancelEditing();

      // Refresh the records to show updated data
      setTimeout(async () => {
        console.log('Triggering data refresh...');
        if (shouldUseLinkedRecords) {
          await mutateLinked();
        } else {
          await mutate();
        }
        console.log('Data refresh completed');
      }, 50);
      
    } catch (error) {
      console.error('Error saving custom field:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleKeyPress = (e, recordId, fieldName, columnType) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCustomFieldEdit(recordId, fieldName, editingValue, columnType);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const moveColumn = (columnKey, direction) => {
    setColumnOrder(prev => {
      const currentIndex = prev.indexOf(columnKey);
      if (currentIndex === -1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newOrder = [...prev];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      
      // Auto-save the configuration
      autoSaveConfig(visibleColumns, newOrder, columnDisplayNames, graphsExpanded);
      
      return newOrder;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, columnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', columnKey);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const draggedColumnKey = draggedColumn;
    
    if (!draggedColumnKey) return;
    
    setColumnOrder(prev => {
      const dragIndex = prev.indexOf(draggedColumnKey);
      if (dragIndex === -1) return prev;
      
      const newOrder = [...prev];
      const [draggedItem] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedItem);
      
      // Auto-save the configuration
      autoSaveConfig(visibleColumns, newOrder, columnDisplayNames, graphsExpanded);
      
      return newOrder;
    });
    
    setDraggedColumn(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverIndex(null);
  };

  const getVisibleColumnsInOrder = () => {
    return columnOrder.filter(columnKey => visibleColumns.includes(columnKey));
  };

  const getAvailableColumns = () => {
    return Object.keys(currentColumnMetadata).filter(columnKey => !visibleColumns.includes(columnKey));
  };

  const addColumn = (columnKey) => {
    if (!visibleColumns.includes(columnKey)) {
      const newVisibleColumns = [...visibleColumns, columnKey];
      let newColumnOrder = columnOrder;
      
      setVisibleColumns(newVisibleColumns);
      if (!columnOrder.includes(columnKey)) {
        newColumnOrder = [...columnOrder, columnKey];
        setColumnOrder(newColumnOrder);
      }
      
      // Auto-save the configuration
      autoSaveConfig(newVisibleColumns, newColumnOrder, columnDisplayNames, graphsExpanded);
    }
    setShowAddColumn(false);
  };

  const removeColumn = (columnKey) => {
    const newVisibleColumns = visibleColumns.filter(key => key !== columnKey);
    setVisibleColumns(newVisibleColumns);
    
    // Auto-save the configuration
    autoSaveConfig(newVisibleColumns, columnOrder, columnDisplayNames, graphsExpanded);
  };

  const toggleSystemExpansion = (systemKey) => {
    setExpandedSystems(prev => ({
      ...prev,
      [systemKey]: !prev[systemKey]
    }));
  };

  // Custom column handlers
  const handleSaveCustomColumn = async (columnData) => {
    try {
      if (editingColumn) {
        await updateColumn(editingColumn.id, columnData);
      } else {
        await createColumn(columnData);
      }
      setShowCustomColumnForm(false);
      setEditingColumn(null);
    } catch (error) {
      console.error('Error saving custom column:', error);
      throw error;
    }
  };

  const handleEditCustomColumn = (column) => {
    setEditingColumn(column);
    setShowCustomColumnForm(true);
  };

  const handleDeleteCustomColumn = async (columnId) => {
    if (confirm('Are you sure you want to delete this custom column? This cannot be undone.')) {
      try {
        await deleteColumn(columnId);
      } catch (error) {
        console.error('Error deleting custom column:', error);
        alert('Failed to delete custom column');
      }
    }
  };

  // Display name editing handlers
  const startEditingDisplayName = (columnKey, currentName) => {
    setEditingDisplayName({ columnKey, currentName });
    setDisplayNameInput(currentName);
  };

  const saveDisplayName = () => {
    if (editingDisplayName && displayNameInput.trim()) {
      const newDisplayNames = {
        ...columnDisplayNames,
        [editingDisplayName.columnKey]: displayNameInput.trim()
      };
      setColumnDisplayNames(newDisplayNames);
      // Auto-save the configuration with the new display names (deferred)
      setTimeout(() => {
        autoSaveConfig(visibleColumns, columnOrder, newDisplayNames, graphsExpanded);
      }, 0);
    }
    setEditingDisplayName(null);
    setDisplayNameInput('');
  };

  const cancelDisplayNameEdit = () => {
    setEditingDisplayName(null);
    setDisplayNameInput('');
  };

  const renderTableCell = (record, columnKey) => {
    const meta = currentColumnMetadata[columnKey];
    
    // Return empty cell if record is null (system doesn't exist for this record)
    if (record === null) {
      return <span className="text-gray-500 font-medium italic">-</span>;
    }
    
    // Return empty cell if metadata doesn't exist
    if (!meta) {
      console.warn(`No metadata found for column: ${columnKey}`);
      return <span className="text-gray-500">-</span>;
    }
    
    // Handle linked record columns (new structure)
    if (meta.group === 'linked' && record.isLinkedPair && record.combinedData) {
      const value = record.combinedData[columnKey];
      if (value === null || value === undefined) {
        return <span className="text-gray-500">-</span>;
      }
      
      // Special rendering for different linked column types
      switch (columnKey) {
        case 'mappingName':
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {value}
            </span>
          );
        case 'linkedField':
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {value}
            </span>
          );
        case 'linkedValue':
          return (
            <span className="font-medium text-gray-900">{value}</span>
          );
        default:
          // For system-specific fields (zendesk_id, jira_subject, etc.)
          if (columnKey.includes('_id')) {
            return (
              <span className="font-mono text-sm text-gray-700">{value}</span>
            );
          } else if (columnKey.includes('_status')) {
            return (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
                {value}
              </span>
            );
          } else if (columnKey.includes('_subject')) {
            return (
              <span className="text-gray-900" title={value}>
                {truncateText(value, 60)}
              </span>
            );
          } else {
            return <span className="text-gray-900">{value}</span>;
          }
      }
    }
    
    const [system, field] = columnKey.split('.');
    
    // Handle custom columns
    if (system === 'custom') {
      let value = '-';
      try {
        const customFields = getCustomFields(record);
        value = customFields[field] || meta?.customColumn?.defaultValue || '-';
        
        // Debug logging
        if (field === 'test' || customFields[field] !== undefined) {
          console.log('Custom field display:', { 
            recordId: record.id, 
            field, 
            customFields, 
            value,
            rawCustomFields: record.customFields,
            customFieldsType: typeof record.customFields
          });
        }
      } catch (error) {
        console.warn('Error parsing custom fields:', error);
        value = '-';
      }

      // Check if this cell is being edited
      const isEditing = editingCell?.recordId === record.id && editingCell?.fieldName === field;

      if (isEditing) {
        // Render inline editor based on column type
        switch (meta?.type) {
          case 'boolean':
            return (
              <select
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveCustomFieldEdit(record.id, field, editingValue, meta.type)}
                onKeyDown={(e) => handleKeyPress(e, record.id, field, meta.type)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                disabled={isSavingEdit}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            );
          case 'select':
            const options = JSON.parse(meta?.customColumn?.selectOptions || '[]');
            return (
              <select
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveCustomFieldEdit(record.id, field, editingValue, meta.type)}
                onKeyDown={(e) => handleKeyPress(e, record.id, field, meta.type)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                disabled={isSavingEdit}
              >
                <option value="">Select an option</option>
                {options.map((option, idx) => (
                  <option key={idx} value={option}>{option}</option>
                ))}
              </select>
            );
          case 'date':
            return (
              <input
                type="date"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveCustomFieldEdit(record.id, field, editingValue, meta.type)}
                onKeyDown={(e) => handleKeyPress(e, record.id, field, meta.type)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="Select a date"
                autoFocus
                disabled={isSavingEdit}
              />
            );
          case 'number':
            return (
              <input
                type="number"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveCustomFieldEdit(record.id, field, editingValue, meta.type)}
                onKeyDown={(e) => handleKeyPress(e, record.id, field, meta.type)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="Enter a number"
                autoFocus
                disabled={isSavingEdit}
              />
            );
          default: // text
            return (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveCustomFieldEdit(record.id, field, editingValue, meta.type)}
                onKeyDown={(e) => handleKeyPress(e, record.id, field, meta.type)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="Enter text"
                autoFocus
                disabled={isSavingEdit}
              />
            );
        }
      }

      // Normal display mode (not editing)
      if (value === null || value === undefined || value === '') {
        value = '-';
      }

      // Render custom column in display mode
      return (
        <div className={`${meta?.type === 'boolean' ? '' : 'cursor-pointer hover:bg-blue-50 transition-colors rounded w-full h-full p-1 border border-transparent hover:border-blue-200'}`} onClick={meta?.type === 'boolean' ? undefined : () => startEditing(record.id, field, value, meta.type)} title={meta?.type === 'boolean' ? undefined : "Click to edit"}>
          {meta?.type === 'boolean' ? (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={value === 'Yes' || value === true}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  saveCustomFieldEdit(record.id, field, newValue, meta.type);
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                disabled={isSavingEdit}
              />
            </div>
          ) : meta?.type === 'select' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              {value}
            </span>
          ) : meta?.type === 'date' ? (
            <span className="text-sm text-gray-700 font-medium">
              {value && value !== '-' ? new Date(value).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              }) : <span className="text-gray-400 italic">Click to add date</span>}
            </span>
          ) : (
            <span className="text-sm text-gray-900 font-medium flex items-center">
              {value === '-' ? <span className="text-gray-400 italic">Click to add {meta.label?.toLowerCase() || field}</span> : value}
              <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
            </span>
          )}
        </div>
      );
    }
    
    // Get value from record based on system and field mapping
    let value;
    
    // The record passed in is already the correct record for this column
    // (RecordTable uses getCellRecordForColumn before calling renderTableCell)
    const targetRecord = record;
    
    if (targetRecord) {
      switch (field) {
        case 'id':
        case 'key':
        case 'number':
        case 'case_number':
        case 'message_id':
          value = targetRecord.sourceId;
          break;
        case 'subject':
        case 'summary':
        case 'title':
          value = targetRecord.title;
          break;
        case 'description':
          value = targetRecord.description;
          break;
        case 'status':
        case 'state':
          value = targetRecord.status;
          break;
        case 'priority':
          value = targetRecord.priority;
          break;
        case 'assignee':
        case 'owner':
          value = targetRecord.assigneeName || targetRecord.assigneeEmail;
          break;
        case 'reporter':
        case 'requester':
        case 'author':
        case 'user':
        case 'from':
          value = targetRecord.reporterName || targetRecord.reporterEmail;
          break;
        case 'created_at':
        case 'created':
        case 'timestamp':
        case 'created_datetime':
          value = targetRecord.sourceCreatedAt;
          break;
        case 'updated_at':
        case 'updated':
          value = targetRecord.sourceUpdatedAt;
          break;
        case 'labels':
        case 'tags':
          // Parse JSON string back to array
          try {
            value = targetRecord.labels ? JSON.parse(targetRecord.labels) : [];
          } catch {
            value = [];
          }
          break;
        case 'channel':
          // Extract channel from customFields.via.channel
          try {
            const customFields = getCustomFields(targetRecord);
            value = customFields.via?.channel || customFields.channel || '-';
          } catch {
            value = '-';
          }
          break;
        case 'satisfaction_rating':
        case 'ticket_form_id':
        case 'brand_id':
        case 'group_id':
        case 'organization_id':
        case 'problem_id':
        case 'has_incidents':
        case 'is_public':
          // Get from customFields
          try {
            const customFields = getCustomFields(targetRecord);
            value = customFields[field];
            value = value || '-';
          } catch {
            value = '-';
          }
          break;
        case 'due_at':
          // Get due date from customFields
          try {
            const customFields = getCustomFields(targetRecord);
            value = customFields.due_at;
          } catch {
            value = '-';
          }
          break;
        default:
          // Handle Zendesk custom fields (format: custom_123456789)
          if (field.startsWith('custom_')) {
            const fieldId = field.substring(7); // Remove 'custom_' prefix
            try {
              const customFields = getCustomFields(targetRecord);
              value = customFields[fieldId] || '-';
            } catch {
              value = '-';
            }
          } else {
            // Try to get from customFields
            try {
              const customFields = getCustomFields(targetRecord);
              value = customFields[field] || '-';
            } catch {
              value = '-';
            }
          }
      }
    } else {
      value = '-'; // Field not applicable to this record's system
    }

    if (value === null || value === undefined) {
      // For boolean columns, show an unchecked checkbox instead of "-"
      if (meta?.type === 'boolean') {
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={false}
              readOnly
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        );
      }
      return <span className="text-gray-500 font-medium italic">-</span>;
    }

    const color = getSystemColor(targetRecord.sourceSystem);
    
    // Special handling for boolean values - render as checkboxes
    if (meta?.type === 'boolean' || typeof value === 'boolean' || (typeof value === 'string' && (value === 'Yes' || value === 'No' || value === 'true' || value === 'false'))) {
      return (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={value === true || value === 'Yes' || value === 'true'}
            readOnly
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
        </div>
      );
    }
    
    switch (meta?.type) {
      case 'badge': {
        // Special color logic for Zendesk and Jira status columns
        if (field === 'status' && (system === 'zendesk' || system === 'jira')) {
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-gray-200 ${getStatusColor(value, system)}`}>
              {value}
            </span>
          );
        }
        // Default badge color logic
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-800 border border-${color}-200`}>
            {value}
          </span>
        );
      }
      case 'user':
        return (
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full bg-${color}-100 flex items-center justify-center`}>
              <span className={`text-xs font-medium text-${color}-600`}>
                {value?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <span className="text-sm text-gray-900 font-medium">{value}</span>
          </div>
        );
      case 'date':
        return (
          <span className="text-sm text-gray-700 font-medium">
            {value ? new Date(value).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            }) : '-'}
          </span>
        );
      case 'tags':
        return (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(value) ? value.slice(0, 2).map((tag, idx) => (
              <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-${color}-100 text-${color}-700 font-medium`}>
                {tag}
              </span>
            )) : null}
            {Array.isArray(value) && value.length > 2 && (
              <span className="text-xs text-gray-600 font-medium">+{value.length - 2}</span>
            )}
          </div>
        );
      default:
        // Special handling for subject/title/description fields to prevent wide tables
        if (field === 'subject' || field === 'summary' || field === 'title' || field === 'description') {
          const truncatedValue = truncateText(value, 60);
          const isLongText = value && value.length > 60;
          
          return (
            <span 
              className="text-sm text-gray-900 font-medium block break-words" 
              title={isLongText ? value : undefined}
              style={{ wordBreak: 'break-word', hyphens: 'auto' }}
            >
              {truncatedValue}
            </span>
          );
        }
        
        return <span className="text-sm text-gray-900 font-medium">{value}</span>;
    }
  };

  // Helper: merge a record and its linked records into a single row object
  const getMergedRow = (record) => {
    // Start with the main record
    const merged = { ...record };
    // For each linked record, copy any fields that are missing or system-specific
    (record.linkedRecords || []).forEach(linked => {
      // For each column, if the merged row doesn't have a value for that system, use the linked record's value
      getVisibleColumnsInOrder().forEach(columnKey => {
        const [system] = columnKey.split('.');
        // If merged row's sourceSystem doesn't match, and linked does, use linked's value
        if (linked.sourceSystem === system && merged.sourceSystem !== system) {
          merged[columnKey] = linked[columnKey] !== undefined ? linked[columnKey] : linked[columnKey.split('.')[1]];
          // Also copy generic fields if present
          if (linked[columnKey.split('.')[1]] !== undefined) {
            merged[columnKey.split('.')[1]] = linked[columnKey.split('.')[1]];
          }
        }
      });
    });
    return merged;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FlowLink Dashboard</h1>
            <p className="text-gray-600 mt-1">Unified view with cross-system record linking</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Configuration save status indicator */}
            {configSaveStatus && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                configSaveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                configSaveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {configSaveStatus === 'saving' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Saving...
                  </>
                )}
                {configSaveStatus === 'saved' && (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved
                  </>
                )}
                {configSaveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Save failed
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => setShowConnectedSystems(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors cursor-pointer"
            >
              <Link className="w-4 h-4" />
              Connections
            </button>
            <button
              onClick={() => setShowColumnConfig(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              Columns
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => window.location.href = '/settings'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* System Status Component */}
        <SystemStatus 
          showConnectedSystems={showConnectedSystems}
          setShowConnectedSystems={setShowConnectedSystems}
          connectedSystems={connectedSystems}
          integrationStatuses={integrationStatuses}
          checkAllIntegrationStatuses={checkAllIntegrationStatuses}
          navigateToTickets={navigateToTickets}
          navigateToZendeskTickets={navigateToZendeskTickets}
          navigateToJiraIssues={navigateToJiraIssues}
          setShowZendeskSetup={setShowZendeskSetup}
        />
        
        {/* Zendesk Setup Modal */}
        {showZendeskSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl relative">
              <button
                onClick={() => setShowZendeskSetup(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Close Zendesk Setup Modal"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Connect Zendesk</h2>
              <ZendeskSetupForm />
            </div>
          </div>
        )}
        
        {/* Ticket Analytics Graphs */}
        <AnalyticsCharts 
          processedRecords={processedRecords}
          currentColumnMetadata={currentColumnMetadata}
          visibleColumns={visibleColumns}
          getRecordFieldValue={getRecordFieldValue}
          graphsExpanded={graphsExpanded}
          setGraphsExpanded={handleGraphsToggle}
        />
        
        {/* Field Mappings Overview */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Field Mappings</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {(mappings || []).filter(m => m.isActive).length === 0 ? (
              <p className="text-gray-600 text-center py-4">No field mappings configured. Click &quot;Link Fields&quot; to create connections.</p>
            ) : (
              <div className="space-y-3">
                {(mappings || []).filter(m => m.isActive).map((mapping) => {
                  // Color map for system badges
                  const systemColorMap = {
                    zendesk: 'green',
                    jira: 'blue',
                    slack: 'red',
                    github: 'gray',
                    salesforce: 'blue',
                    teams: 'purple'
                  };
                  const getBadgeClasses = (system) => {
                    const color = systemColorMap[system?.toLowerCase()] || 'gray';
                    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`;
                  };
                  return (
                    <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={getBadgeClasses(mapping.sourceSystem)}>
                          {mapping.sourceSystem}
                        </span>
                        <span className="text-sm text-gray-600">{mapping.sourceField}</span>
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{mapping.targetField}</span>
                        <span className={getBadgeClasses(mapping.targetSystem)}>
                          {mapping.targetSystem}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{mapping.mappingName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <FilterControls 
          // Search functionality
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          
          // System filter with persistence
          filterSystem={filterSystem}
          setFilterSystem={handleFilterSystemChange}
          
          // Status filter with persistence
          filterStatusColumn={filterStatusColumn}
          setFilterStatusColumn={handleFilterStatusColumnChange}
          filterStatusValue={filterStatusValue}
          setFilterStatusValue={handleFilterStatusValueChange}
          
          // Hide solved tickets filter
          hideSolvedTickets={hideSolvedTickets}
          setHideSolvedTickets={handleHideSolvedTicketsChange}
          
          // Available options
          getAvailableStatusColumns={getAvailableStatusColumns}
          getAvailableStatusValues={getAvailableStatusValues}
        />

        {/* Records Count Display */}
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {linkedRecords.length} of {records.length} records
              {filterSystem !== 'all' && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {filterSystem === 'linked' ? 'Linked Only' : 'Unlinked Only'}
                </span>
              )}
              {hideSolvedTickets && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Solved Hidden
                </span>
              )}
              {(searchTerm || filterStatusColumn !== 'all') && (
                <span className="ml-2 text-xs text-gray-500">(filtered)</span>
              )}
            </div>
          </div>
        </div>

        {/* Records Table */}
        <RecordTable 
          // Data
          linkedRecords={linkedRecords}
          currentColumnMetadata={currentColumnMetadata}
          
          // Sorting
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          handleSort={handleSort}
          getSortIndicator={getSortIndicator}
          
          // Columns
          getVisibleColumnsInOrder={getVisibleColumnsInOrder}
          
          // Table cell rendering
          renderTableCell={renderTableCell}
          getCellRecordForColumn={getCellRecordForColumn}
          
          // Editing
          editingCell={editingCell}
          setEditingCell={setEditingCell}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          isSavingEdit={isSavingEdit}
          startEditing={startEditing}
          saveCustomFieldEdit={saveCustomFieldEdit}
          
          // Utility functions
          getCustomFields={getCustomFields}
          getStatusColor={getStatusColor}
          getSystemColor={getSystemColor}
          
          // Handle key press for editing
          handleKeyPress={handleKeyPress}
        />
      </div>

        {/* Column Manager */}
        <ColumnManager 
          // Modal state
          showColumnConfig={showColumnConfig}
          setShowColumnConfig={setShowColumnConfig}
          showAddColumn={showAddColumn}
          setShowAddColumn={setShowAddColumn}
          showCustomColumnForm={showCustomColumnForm}
          setShowCustomColumnForm={setShowCustomColumnForm}
          
          // Column data
          currentColumnMetadata={currentColumnMetadata}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          columnDisplayNames={columnDisplayNames}
          
          // Column functions
          getVisibleColumnsInOrder={getVisibleColumnsInOrder}
          getAvailableColumns={getAvailableColumns}
          addColumn={addColumn}
          removeColumn={removeColumn}
          moveColumn={moveColumn}
          
          // Drag and drop state
          draggedColumn={draggedColumn}
          setDraggedColumn={setDraggedColumn}
          dragOverIndex={dragOverIndex}
          setDragOverIndex={setDragOverIndex}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          handleDragEnd={handleDragEnd}
          
          // System expansion
          expandedSystems={expandedSystems}
          toggleSystemExpansion={toggleSystemExpansion}
          
          // Custom columns
          customColumns={customColumns}
          editingColumn={editingColumn}
          setEditingColumn={setEditingColumn}
          handleSaveCustomColumn={handleSaveCustomColumn}
          handleEditCustomColumn={handleEditCustomColumn}
          handleDeleteCustomColumn={handleDeleteCustomColumn}
          
          // Display name editing
          editingDisplayName={editingDisplayName}
          setEditingDisplayName={setEditingDisplayName}
          displayNameInput={displayNameInput}
          setDisplayNameInput={setDisplayNameInput}
          startEditingDisplayName={startEditingDisplayName}
          saveDisplayName={saveDisplayName}
          cancelDisplayNameEdit={cancelDisplayNameEdit}
        />

    </div>
  );
};

export default SystemIntegrationDashboard;