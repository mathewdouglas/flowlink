"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Settings, ExternalLink, RefreshCw, Filter, Search, AlertCircle, CheckCircle, Clock, X, Link, Edit3, Eye, EyeOff, ArrowRight, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useFlowRecords, useDashboardConfig } from '../hooks/useFlowLink';
import { useRecordLinks, useFieldMappings } from '../hooks/useRecordLinking';

// This would come from your auth system - using the actual seeded org ID
const CURRENT_USER_ID = 'cmfroy65h0001pldk9103iapw';
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

const SystemIntegrationDashboard = () => {
  // Database hooks for real data
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSystem, setSelectedSystem] = useState('all');
  const { records, pagination, isLoading, mutate } = useFlowRecords(CURRENT_ORG_ID, selectedSystem, currentPage);
  const { config, saveConfig } = useDashboardConfig(CURRENT_USER_ID, CURRENT_ORG_ID);
  
  // Linking hooks with fallback empty arrays
  const { links = [], createLink, deleteLink } = useRecordLinks(CURRENT_ORG_ID) || {};
  const { mappings = [], createMapping, updateMapping, deleteMapping } = useFieldMappings(CURRENT_ORG_ID) || {};

  const [connectedSystems, setConnectedSystems] = useState([
    { id: 1, name: 'Zendesk', type: 'support', status: 'connected', color: 'bg-green-500' },
    { id: 2, name: 'Jira', type: 'project', status: 'connected', color: 'bg-blue-500' },
    { id: 3, name: 'Slack', type: 'communication', status: 'error', color: 'bg-red-500' },
    { id: 4, name: 'GitHub', type: 'development', status: 'connected', color: 'bg-gray-800' },
    { id: 5, name: 'Salesforce', type: 'crm', status: 'pending', color: 'bg-blue-600' },
    { id: 6, name: 'Teams', type: 'communication', status: 'connected', color: 'bg-purple-600' }
  ]);

  // Local state for managing column configuration - use arrays instead of objects for consistency
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);

  // Update local state when config loads
  useEffect(() => {
    if (config) {
      setVisibleColumns(config.visibleColumns || []);
      setColumnOrder(config.columnOrder || []);
    } else {
      // Set default visible columns if no config exists
      const defaultColumns = [
        'zendesk.id', 'zendesk.subject', 'zendesk.status', 'zendesk.priority',
        'jira.key', 'jira.summary', 'jira.status', 'jira.priority'
      ];
      setVisibleColumns(defaultColumns);
      setColumnOrder(defaultColumns);
    }
  }, [config]);

  // Field mapping and linking configuration (keep for future enhancement)
  const [fieldMappings, setFieldMappings] = useState([
    { id: 1, system1: 'Zendesk', field1: 'jira_id', system2: 'Jira', field2: 'id', active: true, name: 'Zendesk-Jira Escalation' }
  ]);

  // Column metadata with display names, types, and order
  const columnMetadata = {
    'zendesk.id': { label: 'Ticket ID', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.subject': { label: 'Subject', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.priority': { label: 'Priority', color: 'green', group: 'zendesk', type: 'badge' },
    'zendesk.status': { label: 'Status', color: 'green', group: 'zendesk', type: 'badge' },
    'zendesk.assignee': { label: 'Assignee', color: 'green', group: 'zendesk', type: 'user' },
    'zendesk.requester': { label: 'Requester', color: 'green', group: 'zendesk', type: 'user' },
    'zendesk.created_at': { label: 'Created', color: 'green', group: 'zendesk', type: 'date' },
    'zendesk.updated_at': { label: 'Updated', color: 'green', group: 'zendesk', type: 'date' },
    'zendesk.satisfaction_rating': { label: 'Satisfaction', color: 'green', group: 'zendesk', type: 'rating' },
    'zendesk.channel': { label: 'Channel', color: 'green', group: 'zendesk', type: 'text' },
    'zendesk.tags': { label: 'Tags', color: 'green', group: 'zendesk', type: 'tags' },

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
  };

  // Drag and drop state
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [expandedSystems, setExpandedSystems] = useState({
    zendesk: true,
    jira: true,
    slack: false,
    github: false,
    salesforce: false,
    teams: false
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSystem, setFilterSystem] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSystemsExpanded, setIsSystemsExpanded] = useState(true);

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
    const matchesStatus = filterStatus === 'all' || 
      record.status?.toLowerCase() === filterStatus.toLowerCase();

    // System filter (handled by selectedSystem already)
    return matchesSearch && matchesStatus;
  });

  // Create linked records structure similar to original dashboard
  const linkedRecords = filteredRecords.map(record => {
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
  const handleRefresh = () => {
    setIsRefreshing(true);
    mutate(); // Refresh data from API
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Save configuration
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

  // Get system color based on source system
  const getSystemColor = (system) => {
    const colors = {
      zendesk: 'green',
      jira: 'blue', 
      slack: 'red',
      github: 'gray',
      salesforce: 'blue',
      teams: 'purple'
    };
    return colors[system] || 'gray';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-800 bg-red-100 border-red-200';
      case 'High': return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'Medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'Low': return 'text-green-800 bg-green-100 border-green-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'text-blue-800 bg-blue-100';
      case 'In Progress': return 'text-orange-800 bg-orange-100';
      case 'Review': return 'text-purple-800 bg-purple-100';
      case 'Resolved': case 'Done': return 'text-green-800 bg-green-100';
      case 'Pending': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCompanyIcon = (systemName) => {
    const iconMap = {
      zendesk: '/assets/logos/zendesk.svg',
      jira: '/assets/logos/jira.svg',
      slack: '/assets/logos/slack.svg',
      github: '/assets/logos/github.svg',
      salesforce: '/assets/logos/salesforce.svg',
      teams: '/assets/logos/teams.svg'
    };

    const iconPath = iconMap[systemName.toLowerCase()];
    
    if (iconPath) {
      return (
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
          <Image
            src={iconPath}
            alt={`${systemName} logo`}
            width={24}
            height={24}
            className="w-6 h-6"
          />
        </div>
      );
    }

    // Fallback for unknown systems
    return (
      <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
        {systemName.charAt(0).toUpperCase()}
      </div>
    );
  };

  const toggleColumnVisibility = (columnKey) => {
    if (visibleColumns.includes(columnKey)) {
      setVisibleColumns(visibleColumns.filter(key => key !== columnKey));
    } else {
      setVisibleColumns([...visibleColumns, columnKey]);
      if (!columnOrder.includes(columnKey)) {
        setColumnOrder([...columnOrder, columnKey]);
      }
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
    return Object.keys(columnMetadata).filter(columnKey => !visibleColumns.includes(columnKey));
  };

  const addColumn = (columnKey) => {
    if (!visibleColumns.includes(columnKey)) {
      setVisibleColumns([...visibleColumns, columnKey]);
      if (!columnOrder.includes(columnKey)) {
        setColumnOrder([...columnOrder, columnKey]);
      }
    }
    setShowAddColumn(false);
  };

  const removeColumn = (columnKey) => {
    setVisibleColumns(visibleColumns.filter(key => key !== columnKey));
  };

  const toggleSystemExpansion = (systemKey) => {
    setExpandedSystems(prev => ({
      ...prev,
      [systemKey]: !prev[systemKey]
    }));
  };

  const renderTableCell = (record, columnKey) => {
    const meta = columnMetadata[columnKey];
    const [system, field] = columnKey.split('.');
    
    // Get value from record based on system and field mapping
    let value;
    if (record.sourceSystem === system) {
      switch (field) {
        case 'id':
        case 'key':
        case 'number':
        case 'case_number':
        case 'message_id':
          value = record.sourceId;
          break;
        case 'subject':
        case 'summary':
        case 'title':
          value = record.title;
          break;
        case 'status':
        case 'state':
          value = record.status;
          break;
        case 'priority':
          value = record.priority;
          break;
        case 'assignee':
        case 'owner':
          value = record.assigneeName || record.assigneeEmail;
          break;
        case 'reporter':
        case 'requester':
        case 'author':
        case 'user':
        case 'from':
          value = record.reporterName || record.reporterEmail;
          break;
        case 'created_at':
        case 'created':
        case 'timestamp':
        case 'created_datetime':
          value = record.sourceCreatedAt;
          break;
        case 'updated_at':
        case 'updated':
          value = record.sourceUpdatedAt;
          break;
        case 'labels':
        case 'tags':
          // Parse JSON string back to array
          try {
            value = record.labels ? JSON.parse(record.labels) : [];
          } catch {
            value = [];
          }
          break;
        default:
          // Try to get from customFields
          try {
            const customFields = record.customFields ? JSON.parse(record.customFields) : {};
            value = customFields[field] || '-';
          } catch {
            value = '-';
          }
      }
    } else {
      value = '-'; // Field not applicable to this record's system
    }

    if (value === null || value === undefined) {
      return <span className="text-gray-500 font-medium italic">-</span>;
    }

    const color = getSystemColor(record.sourceSystem);
    
    switch (meta?.type) {
      case 'badge':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-800 border border-${color}-200`}>
            {value}
          </span>
        );
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
            {value ? new Date(value).toLocaleDateString() : '-'}
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
        return <span className="text-sm text-gray-900 font-medium">{value}</span>;
    }
  };

  const addFieldMapping = async (sourceSystem, sourceField, targetSystem, targetField, mappingName) => {
    try {
      await createMapping({
        sourceSystem,
        sourceField,
        targetSystem,
        targetField,
        mappingName
      });
    } catch (error) {
      console.error('Failed to create field mapping:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Integration Dashboard</h1>
            <p className="text-gray-600 mt-1">Unified view with cross-system record linking</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColumnConfig(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              Columns
            </button>
            <button
              onClick={() => setShowAddMapping(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Link className="w-4 h-4" />
              Link Fields
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Connected Systems Overview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Connected Systems</h2>
            <button
              onClick={() => setIsSystemsExpanded(!isSystemsExpanded)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isSystemsExpanded ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">Collapse</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Expand</span>
                </>
              )}
            </button>
          </div>
          
          {isSystemsExpanded ? (
            // Expanded view - original cards
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {connectedSystems.map((system) => (
                <div key={system.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-3 h-3 rounded-full ${system.color}`}></div>
                    {getStatusIcon(system.status)}
                  </div>
                  <h3 className="font-medium text-gray-900">{system.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{system.type}</p>
                </div>
              ))}
            </div>
          ) : (
            // Collapsed view - compact icons
            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
              {connectedSystems.map((system) => (
                <div key={system.id} className="relative group">
                  <div className="flex items-center gap-2">
                    {getCompanyIcon(system.name)}
                    <div className="absolute -top-1 -right-1">
                      {getStatusIcon(system.status)}
                    </div>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {system.name} - {system.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Field Mappings Overview */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Field Mappings</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {(mappings || []).filter(m => m.isActive).length === 0 ? (
              <p className="text-gray-600 text-center py-4">No field mappings configured. Click &quot;Link Fields&quot; to create connections.</p>
            ) : (
              <div className="space-y-3">
                {(mappings || []).filter(m => m.isActive).map((mapping) => (
                  <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {mapping.sourceSystem}
                      </span>
                      <span className="text-sm text-gray-600">{mapping.sourceField}</span>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{mapping.targetField}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {mapping.targetSystem}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{mapping.mappingName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search across all linked records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={filterSystem}
                onChange={(e) => setFilterSystem(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Records</option>
                <option value="linked">Linked Records</option>
                <option value="unlinked">Unlinked Records</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Unified Linked Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Link Status</th>
                  {getVisibleColumnsInOrder().map(columnKey => {
                    const meta = columnMetadata[columnKey];
                    const getColorClass = (color) => {
                      switch(color) {
                        case 'green': return 'text-green-700';
                        case 'blue': return 'text-blue-700';
                        case 'red': return 'text-red-700';
                        case 'gray': return 'text-gray-700';
                        case 'purple': return 'text-purple-700';
                        default: return 'text-gray-700';
                      }
                    };
                    return (
                      <th key={columnKey} className={`px-4 py-3 text-left text-xs font-medium ${getColorClass(meta.color)} uppercase tracking-wider`}>
                        {meta.label}
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {linkedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {record.hasLinks ? (
                        <div className="flex items-center gap-2">
                          <Link className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">
                            Linked ({record.linkedRecords.length})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-700 font-medium">Unlinked</span>
                        </div>
                      )}
                    </td>
                    {getVisibleColumnsInOrder().map(columnKey => (
                      <td key={columnKey} className="px-4 py-4 whitespace-nowrap">
                        {renderTableCell(record, columnKey)}
                      </td>
                    ))}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-800 transition-colors duration-200" title="Open in source system">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 transition-colors duration-200" title="Configure record">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {linkedRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No records found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Add Field Mapping Modal */}
      {showAddMapping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Field Mapping</h3>
              <button
                onClick={() => setShowAddMapping(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-800">Create a relationship between fields in different systems.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Source System</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option>Zendesk</option>
                    <option>Jira</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Source Field</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option>jira_id</option>
                    <option>external_ref</option>
                    <option>linked_ticket</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <ArrowRight className="w-6 h-6 text-gray-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Target System</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option>Jira</option>
                    <option>Zendesk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Target Field</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option>id</option>
                    <option>key</option>
                    <option>ticket_number</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Mapping Name</label>
                <input
                  type="text"
                  placeholder="e.g., Support Escalation Tracking"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddMapping(false)}
                className="px-4 py-2 text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Add the mapping logic here
                  setShowAddMapping(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Configuration Modal */}
      {showColumnConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Configure Columns</h3>
              <button
                onClick={() => setShowColumnConfig(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <p className="text-base text-gray-800">
                  Manage your active columns and their order:
                </p>
                <button
                  onClick={() => setShowAddColumn(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Column
                </button>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <GripVertical className="w-5 h-5" />
                  Active Columns ({getVisibleColumnsInOrder().length})
                </h4>
                <p className="text-sm text-gray-600 mb-6">
                  Drag items to reorder columns, or use the arrow buttons. Click the X to remove columns.
                </p>
                
                {getVisibleColumnsInOrder().length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No active columns</p>
                    <p className="text-sm mt-2">Click &quot;Add Column&quot; to get started</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {getVisibleColumnsInOrder().map((columnKey, index) => {
                      const meta = columnMetadata[columnKey];
                      const getColorClass = (color) => {
                        switch(color) {
                          case 'green': return 'text-green-700';
                          case 'blue': return 'text-blue-700';
                          case 'red': return 'text-red-700';
                          case 'gray': return 'text-gray-700';
                          case 'purple': return 'text-purple-700';
                          default: return 'text-gray-700';
                        }
                      };
                      const isDragging = draggedColumn === columnKey;
                      const isDragOver = dragOverIndex === index;
                      
                      return (
                        <div
                          key={columnKey}
                          draggable
                          onDragStart={(e) => handleDragStart(e, columnKey)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-move ${
                            isDragging 
                              ? 'bg-blue-100 border-blue-300 opacity-50 scale-105' 
                              : isDragOver
                              ? 'bg-green-100 border-green-300 border-dashed'
                              : 'bg-gray-100 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveColumn(columnKey, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveColumn(columnKey, 'down')}
                              disabled={index === getVisibleColumnsInOrder().length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${getColorClass(meta.color)}`}>
                              {meta.label}
                            </span>
                            <div className="text-xs text-gray-500 capitalize">
                              {meta.group}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 font-mono bg-gray-200 px-2 py-1 rounded">
                            #{index + 1}
                          </div>
                          
                          <button
                            onClick={() => removeColumn(columnKey)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove column"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowColumnConfig(false)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Column</h3>
              <button
                onClick={() => setShowAddColumn(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-800 mb-4">
                Select a column to add to your table:
              </p>
              
              {getAvailableColumns().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">All columns are already active</p>
                  <p className="text-xs mt-1">Remove columns from the main view to add different ones</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSystemExpansion('zendesk')}
                      className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-green-800">Available Zendesk Fields</h4>
                        <span className="text-xs text-green-600 bg-green-200 px-2 py-0.5 rounded-full">
                          {getAvailableColumns().filter(key => key.startsWith('zendesk.')).length}
                        </span>
                      </div>
                      {expandedSystems.zendesk ? (
                        <ChevronUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                    
                    {expandedSystems.zendesk && (
                      <div className="space-y-2 ml-4">
                        {getAvailableColumns()
                          .filter(key => key.startsWith('zendesk.'))
                          .map(columnKey => {
                            const meta = columnMetadata[columnKey];
                            return (
                              <button
                                key={columnKey}
                                onClick={() => addColumn(columnKey)}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-green-50 rounded-lg border border-green-100 transition-colors text-left"
                              >
                                <div>
                                  <span className="text-sm font-medium text-green-700">
                                    {meta.label}
                                  </span>
                                  <div className="text-xs text-green-600 capitalize">
                                    {meta.group}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-green-600" />
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSystemExpansion('jira')}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-blue-800">Available Jira Fields</h4>
                        <span className="text-xs text-blue-600 bg-blue-200 px-2 py-0.5 rounded-full">
                          {getAvailableColumns().filter(key => key.startsWith('jira.')).length}
                        </span>
                      </div>
                      {expandedSystems.jira ? (
                        <ChevronUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                    
                    {expandedSystems.jira && (
                      <div className="space-y-2 ml-4">
                        {getAvailableColumns()
                          .filter(key => key.startsWith('jira.'))
                          .map(columnKey => {
                            const meta = columnMetadata[columnKey];
                            return (
                              <button
                                key={columnKey}
                                onClick={() => addColumn(columnKey)}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors text-left"
                              >
                                <div>
                                  <span className="text-sm font-medium text-blue-700">
                                    {meta.label}
                                  </span>
                                  <div className="text-xs text-blue-600 capitalize">
                                    {meta.group}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-blue-600" />
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSystemExpansion('slack')}
                      className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-red-800">Available Slack Fields</h4>
                        <span className="text-xs text-red-600 bg-red-200 px-2 py-0.5 rounded-full">
                          {getAvailableColumns().filter(key => key.startsWith('slack.')).length}
                        </span>
                      </div>
                      {expandedSystems.slack ? (
                        <ChevronUp className="w-4 h-4 text-red-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-red-600" />
                      )}
                    </button>
                    
                    {expandedSystems.slack && (
                      <div className="space-y-2 ml-4">
                        {getAvailableColumns()
                          .filter(key => key.startsWith('slack.'))
                          .map(columnKey => {
                            const meta = columnMetadata[columnKey];
                            return (
                              <button
                                key={columnKey}
                                onClick={() => addColumn(columnKey)}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-red-50 rounded-lg border border-red-100 transition-colors text-left"
                              >
                                <div>
                                  <span className="text-sm font-medium text-red-700">
                                    {meta.label}
                                  </span>
                                  <div className="text-xs text-red-600 capitalize">
                                    {meta.group}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-red-600" />
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSystemExpansion('github')}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-800">Available GitHub Fields</h4>
                        <span className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                          {getAvailableColumns().filter(key => key.startsWith('github.')).length}
                        </span>
                      </div>
                      {expandedSystems.github ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    
                    {expandedSystems.github && (
                      <div className="space-y-2 ml-4">
                        {getAvailableColumns()
                          .filter(key => key.startsWith('github.'))
                          .map(columnKey => {
                            const meta = columnMetadata[columnKey];
                            return (
                              <button
                                key={columnKey}
                                onClick={() => addColumn(columnKey)}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors text-left"
                              >
                                <div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {meta.label}
                                  </span>
                                  <div className="text-xs text-gray-600 capitalize">
                                    {meta.group}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-gray-600" />
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSystemExpansion('salesforce')}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-blue-800">Available Salesforce Fields</h4>
                        <span className="text-xs text-blue-600 bg-blue-200 px-2 py-0.5 rounded-full">
                          {getAvailableColumns().filter(key => key.startsWith('salesforce.')).length}
                        </span>
                      </div>
                      {expandedSystems.salesforce ? (
                        <ChevronUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                    
                    {expandedSystems.salesforce && (
                      <div className="space-y-2 ml-4">
                        {getAvailableColumns()
                          .filter(key => key.startsWith('salesforce.'))
                          .map(columnKey => {
                            const meta = columnMetadata[columnKey];
                            return (
                              <button
                                key={columnKey}
                                onClick={() => addColumn(columnKey)}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors text-left"
                              >
                                <div>
                                  <span className="text-sm font-medium text-blue-700">
                                    {meta.label}
                                  </span>
                                  <div className="text-xs text-blue-600 capitalize">
                                    {meta.group}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-blue-600" />
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSystemExpansion('teams')}
                      className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-purple-800">Available Teams Fields</h4>
                        <span className="text-xs text-purple-600 bg-purple-200 px-2 py-0.5 rounded-full">
                          {getAvailableColumns().filter(key => key.startsWith('teams.')).length}
                        </span>
                      </div>
                      {expandedSystems.teams ? (
                        <ChevronUp className="w-4 h-4 text-purple-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-purple-600" />
                      )}
                    </button>
                    
                    {expandedSystems.teams && (
                      <div className="space-y-2 ml-4">
                        {getAvailableColumns()
                          .filter(key => key.startsWith('teams.'))
                          .map(columnKey => {
                            const meta = columnMetadata[columnKey];
                            return (
                              <button
                                key={columnKey}
                                onClick={() => addColumn(columnKey)}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-purple-50 rounded-lg border border-purple-100 transition-colors text-left"
                              >
                                <div>
                                  <span className="text-sm font-medium text-purple-700">
                                    {meta.label}
                                  </span>
                                  <div className="text-xs text-purple-600 capitalize">
                                    {meta.group}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-purple-600" />
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddColumn(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemIntegrationDashboard;