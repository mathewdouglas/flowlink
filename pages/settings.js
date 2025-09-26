"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, RefreshCw, AlertCircle, CheckCircle, Clock, X, Link, ArrowRight, Eye, EyeOff, Plus, Edit3, Trash2, Play, Square, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useRecordLinks, useFieldMappings } from '../hooks/useRecordLinking';
import { useSyncService } from '../hooks/useSyncService';
import { useErrors } from '../context/AppContext';
import { LoadingSpinner, ErrorMessage, Modal, Button, Card } from '../components/UI/CommonComponents';
import ZendeskConfigModal from '../components/ZendeskConfigModal';
import JiraConfigModal from '../components/JiraConfigModal';
import FieldTransformationConfig from '../components/FieldTransformationConfig';
import { APP_CONSTANTS } from '../lib/constants';

// This would come from your auth system - using the actual seeded org ID
const CURRENT_USER_ID = 'cmfroy65h0001pldk9103iapw';
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

const SettingsPage = () => {
  // Linking hooks with fallback empty arrays
  const { links = [], createLink, deleteLink } = useRecordLinks(CURRENT_ORG_ID) || {};
  const { mappings = [], createMapping, updateMapping, deleteMapping } = useFieldMappings(CURRENT_ORG_ID) || {};
  
  // Sync service hook
  const { syncStatus, isLoading: isSyncLoading, startService, stopService, triggerSync } = useSyncService(CURRENT_ORG_ID);
  
  // Debug logging to see what's in syncStatus
  console.log('Sync Status:', syncStatus);
  
  // Error handling
  const { addError } = useErrors();

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState(null);

  // Add mapping form state
  const [sourceSystem, setSourceSystem] = useState('Zendesk');
  const [sourceField, setSourceField] = useState('id');
  const [targetSystem, setTargetSystem] = useState('Jira');
  const [targetField, setTargetField] = useState('id');
  const [mappingName, setMappingName] = useState('');
  
  // Field transformation state
  const [sourceTransform, setSourceTransform] = useState(null);
  const [targetTransform, setTargetTransform] = useState(null);

  // Field options state
  const [sourceFields, setSourceFields] = useState([]);
  const [targetFields, setTargetFields] = useState([]);
  const [loadingSourceFields, setLoadingSourceFields] = useState(false);
  const [loadingTargetFields, setLoadingTargetFields] = useState(false);

  // Ref to track if we've checked connectivity
  const hasCheckedConnectivity = useRef(false);
  
  // Refs to prevent duplicate API calls
  const loadingSourceFieldsRef = useRef(false);
  const loadingTargetFieldsRef = useRef(false);
  
  // Stable reference to addError to avoid dependency issues
  const addErrorRef = useRef(addError);
  addErrorRef.current = addError;
  
  // Stable reference to updateSystemStatus
  const updateSystemStatusRef = useRef();

  // Connected systems state
  const [connectedSystems, setConnectedSystems] = useState([
    { id: 'zendesk', name: 'Zendesk', type: 'ticketing', status: 'not connected', color: 'bg-gray-500' },
    { id: 'jira', name: 'Jira', type: 'project management', status: 'not connected', color: 'bg-gray-500' },
    { id: 'slack', name: 'Slack', type: 'messaging', status: 'not connected', color: 'bg-gray-500' },
    { id: 'github', name: 'GitHub', type: 'code repository', status: 'not connected', color: 'bg-gray-500' },
    { id: 'salesforce', name: 'Salesforce', type: 'crm', status: 'not connected', color: 'bg-gray-500' },
    { id: 'teams', name: 'Teams', type: 'messaging', status: 'not connected', color: 'bg-gray-500' }
  ]);

  // Helper to update a system's status and color
  const updateSystemStatus = useCallback((systemName, status) => {
    setConnectedSystems(prev => prev.map(sys => {
      if (sys.id === systemName || sys.name === systemName) {
        let color;
        switch (status) {
          case 'connected': color = 'bg-green-500'; break;
          case 'error': color = 'bg-red-500'; break;
          case 'pending': color = 'bg-yellow-500'; break;
          case 'not connected': color = 'bg-gray-500'; break;
          default: color = 'bg-gray-500';
        }
        return { ...sys, status, color };
      }
      return sys;
    }));
  }, []);

  // Update the ref whenever the function changes
  updateSystemStatusRef.current = updateSystemStatus;

  // Check Zendesk connection status
  const checkZendeskConnection = useCallback(async () => {
    updateSystemStatus('Zendesk', 'pending');
    try {
      const res = await fetch('/api/zendesk/status');
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          updateSystemStatus('Zendesk', 'connected');
        } else {
          updateSystemStatus('Zendesk', data.status === 'not_configured' ? 'not connected' : 'error');
        }
      } else {
        updateSystemStatus('Zendesk', 'error');
      }
    } catch {
      updateSystemStatus('Zendesk', 'error');
    }
  }, [updateSystemStatus]);

  // Check Jira connection status
  const checkJiraConnection = useCallback(async () => {
    updateSystemStatus('Jira', 'pending');
    try {
      const res = await fetch('/api/jira/status');
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          updateSystemStatus('Jira', 'connected');
        } else {
          updateSystemStatus('Jira', data.status === 'not_configured' ? 'not connected' : 'error');
        }
      } else {
        updateSystemStatus('Jira', 'error');
      }
    } catch {
      updateSystemStatus('Jira', 'error');
    }
  }, [updateSystemStatus]);

  // Check connection status on mount
  useEffect(() => {
    checkZendeskConnection();
    checkJiraConnection();
  }, [checkZendeskConnection, checkJiraConnection]);

  // Configuration modal states
  const [showZendeskConfig, setShowZendeskConfig] = useState(false);
  const [showJiraConfig, setShowJiraConfig] = useState(false);

  // Start background sync service  
  const startBackgroundService = useCallback(async () => {
    try {
      await startService();
    } catch (error) {
      console.error('Error starting background service:', error);
      addError('Failed to start background service');
    }
  }, [startService, addError]);

  // Stop background sync service
  const stopBackgroundService = useCallback(async () => {
    try {
      await stopService();
    } catch (error) {
      console.error('Error stopping background service:', error);
      addError('Failed to stop background service');
    }
  }, [stopService, addError]);

  // Trigger manual sync
  const triggerManualSync = useCallback(async () => {
    try {
      setIsManualSyncing(true);
      await triggerSync();
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      addError('Failed to trigger manual sync');
    } finally {
      setIsManualSyncing(false);
    }
  }, [triggerSync, addError]);

  // Handle mapping deletion with confirmation
  const handleDeleteMapping = async () => {
    if (!mappingToDelete) return;
    
    console.log('Deleting mapping:', mappingToDelete);
    
    try {
      await deleteMapping(mappingToDelete.id);
      console.log('Mapping deleted successfully');
      setMappingToDelete(null);
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      addError('Failed to delete field mapping');
    }
  };

  // Load available fields for a system
  const loadFieldsForSystem = useCallback(async (system, isSource = true) => {
    // Prevent duplicate calls
    const loadingRef = isSource ? loadingSourceFieldsRef : loadingTargetFieldsRef;
    if (loadingRef.current) {
      return;
    }
    
    const setLoading = isSource ? setLoadingSourceFields : setLoadingTargetFields;
    const setFields = isSource ? setSourceFields : setTargetFields;
    
    try {
      setLoading(true);
      loadingRef.current = true;
      let fields = [];

      if (system === 'Zendesk') {
        // Load Zendesk fields (standard + custom)
        try {
          // Get credentials first
          const credentialsResponse = await fetch('/api/zendesk/credentials');
          if (credentialsResponse.ok) {
            const credentials = await credentialsResponse.json();
            
            // Get custom fields
            const customFieldsResponse = await fetch(
              `/api/zendesk/custom-fields?subdomain=${credentials.subdomain}&email=${encodeURIComponent(credentials.email)}&apiKey=${encodeURIComponent(credentials.apiKey)}`
            );
            
            if (customFieldsResponse.ok) {
              const customFieldsData = await customFieldsResponse.json();
              const customFields = customFieldsData.customFields || [];
              
              // Add standard Zendesk fields
              fields = [
                { key: 'id', title: 'ID', type: 'system' },
                { key: 'subject', title: 'Subject', type: 'system' },
                { key: 'description', title: 'Description', type: 'system' },
                { key: 'status', title: 'Status', type: 'system' },
                { key: 'priority', title: 'Priority', type: 'system' },
                { key: 'assignee_id', title: 'Assignee ID', type: 'system' },
                { key: 'requester_id', title: 'Requester ID', type: 'system' },
                { key: 'group_id', title: 'Group ID', type: 'system' },
                { key: 'organization_id', title: 'Organization ID', type: 'system' },
                { key: 'created_at', title: 'Created At', type: 'system' },
                { key: 'updated_at', title: 'Updated At', type: 'system' },
                ...customFields.map(field => ({
                  key: `custom_${field.id}`,
                  title: field.title,
                  type: 'custom',
                  fieldType: field.type  // Use 'type' from API response, not 'fieldType'
                }))
              ];
            } else {
              console.error('Failed to fetch custom fields:', customFieldsResponse.status, customFieldsResponse.statusText);
            }
          }
        } catch (error) {
          console.error('Failed to load Zendesk fields:', error);
          // Fallback to basic fields
          fields = [
            { key: 'id', title: 'ID', type: 'system' },
            { key: 'subject', title: 'Subject', type: 'system' },
            { key: 'status', title: 'Status', type: 'system' },
            { key: 'priority', title: 'Priority', type: 'system' },
            { key: 'assignee_id', title: 'Assignee ID', type: 'system' }
          ];
        }
      } else if (system === 'Jira') {
        // Load Jira fields (we'll need to add Jira fields API later)
        fields = [
          { key: 'id', title: 'ID', type: 'system' },
          { key: 'key', title: 'Issue Key', type: 'system' },
          { key: 'summary', title: 'Summary', type: 'system' },
          { key: 'description', title: 'Description', type: 'system' },
          { key: 'status', title: 'Status', type: 'system' },
          { key: 'priority', title: 'Priority', type: 'system' },
          { key: 'assignee', title: 'Assignee', type: 'system' },
          { key: 'reporter', title: 'Reporter', type: 'system' },
          { key: 'issuetype', title: 'Issue Type', type: 'system' },
          { key: 'created', title: 'Created', type: 'system' },
          { key: 'updated', title: 'Updated', type: 'system' }
        ];
      } else {
        // Other systems - basic fields for now
        fields = [
          { key: 'id', title: 'ID', type: 'system' },
          { key: 'title', title: 'Title', type: 'system' },
          { key: 'status', title: 'Status', type: 'system' }
        ];
      }

      setFields(fields);
    } catch (error) {
      console.error('Failed to load fields for system:', system, error);
      if (addErrorRef.current) {
        addErrorRef.current(`Failed to load fields for ${system}`);
      }
      setFields([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []); // Empty dependency array to prevent recreation

  // Load fields when source system changes (only if modal is open)
  useEffect(() => {
    if (showAddMapping && sourceSystem) {
      loadFieldsForSystem(sourceSystem, true);
    }
  }, [sourceSystem, loadFieldsForSystem, showAddMapping]);

  // Load fields when target system changes (only if modal is open)
  useEffect(() => {
    if (showAddMapping && targetSystem) {
      loadFieldsForSystem(targetSystem, false);
    }
  }, [targetSystem, loadFieldsForSystem, showAddMapping]);

  // Initialize fields when modal opens
  useEffect(() => {
    if (showAddMapping) {
      // Load initial fields for default systems
      loadFieldsForSystem(sourceSystem, true);
      loadFieldsForSystem(targetSystem, false);
    }
  }, [showAddMapping, sourceSystem, targetSystem, loadFieldsForSystem]);

  // Check system connectivity status on component mount
  useEffect(() => {
    if (hasCheckedConnectivity.current) return;
    
    const checkSystemConnectivity = async () => {
      hasCheckedConnectivity.current = true;
      
      // Check Zendesk connectivity
      try {
        const zendeskResponse = await fetch('/api/zendesk/credentials');
        if (zendeskResponse.ok) {
          updateSystemStatusRef.current('zendesk', 'connected');
        }
      } catch (error) {
        console.log('Zendesk not connected');
      }

      // Check Jira connectivity
      try {
        const jiraResponse = await fetch('/api/jira/credentials');
        if (jiraResponse.ok) {
          updateSystemStatusRef.current('jira', 'connected');
        }
      } catch (error) {
        console.log('Jira not connected');
      }
    };

    checkSystemConnectivity();
  }, []); // Remove updateSystemStatus from dependencies

  // Refresh Zendesk custom field names
  const refreshZendeskFieldNames = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Get Zendesk credentials first
      const credentialsResponse = await fetch('/api/zendesk/credentials');
      if (!credentialsResponse.ok) {
        throw new Error('No Zendesk credentials found');
      }
      
      const credentials = await credentialsResponse.json();
      console.log('Got credentials:', { subdomain: credentials.subdomain, email: credentials.email });
      
      // Fetch custom fields
      const customFieldsResponse = await fetch(
        `/api/zendesk/custom-fields?subdomain=${credentials.subdomain}&email=${encodeURIComponent(credentials.email)}&apiKey=${encodeURIComponent(credentials.apiKey)}`
      );
      
      if (!customFieldsResponse.ok) {
        const errorText = await customFieldsResponse.text();
        throw new Error(`Failed to fetch custom fields: ${customFieldsResponse.status} ${errorText}`);
      }
      
      const customFieldsData = await customFieldsResponse.json();
      console.log('Got custom fields:', customFieldsData);
      
      if (!customFieldsData.customFields || customFieldsData.customFields.length === 0) {
        alert('No custom fields found in Zendesk');
        return;
      }
      
      // Update dashboard config with new display names
      const configResponse = await fetch(`/api/dashboard/config?userId=${CURRENT_USER_ID}&organizationId=${CURRENT_ORG_ID}`);
      if (configResponse.ok) {
        const currentConfig = await configResponse.json();
        const existingDisplayNames = currentConfig.columnDisplayNames || {};
        const newDisplayNames = { ...existingDisplayNames };
        let updatedCount = 0;
        
        customFieldsData.customFields.forEach(field => {
          if (field.key && field.title) {
            newDisplayNames[field.key] = field.title;
            updatedCount++;
          }
        });
        
        console.log('Updating display names:', newDisplayNames);
        
        // Save updated config
        const saveResponse = await fetch('/api/dashboard/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: CURRENT_USER_ID,
            organizationId: CURRENT_ORG_ID,
            ...currentConfig,
            columnDisplayNames: newDisplayNames
          })
        });
        
        if (!saveResponse.ok) {
          throw new Error('Failed to save updated display names');
        }
        
        alert(`Updated ${updatedCount} custom field display names`);
      }
      
    } catch (error) {
      console.error('Error refreshing custom field names:', error);
      addError('Failed to refresh custom field names: ' + error.message);
    } finally {
      setIsRefreshing(false);
    }
  }, [addError]);

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get company icon
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

    return (
      <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
        {systemName.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage integrations, field mappings, and background sync</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Connected Systems Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {connectedSystems.map((system) => (
              <div key={system.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-3 h-3 rounded-full ${system.color}`}></div>
                  {getStatusIcon(system.status)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {getCompanyIcon(system.name)}
                  <h3 className="font-medium text-gray-900">{system.name}</h3>
                </div>
                <p className="text-sm text-gray-600 capitalize">{system.type}</p>
                <div className="mt-3">
                  {(system.name === 'Zendesk' || system.name === 'Jira') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => system.name === 'Zendesk' ? setShowZendeskConfig(true) : setShowJiraConfig(true)}
                        className={`px-3 py-1.5 text-white text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer ${
                          system.status === 'not connected'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {system.status === 'not connected' ? 'Set up' : 'Configure'}
                      </button>
                      {system.name === 'Zendesk' && system.status === 'connected' && (
                        <button
                          onClick={refreshZendeskFieldNames}
                          disabled={isRefreshing}
                          className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                          title="Refresh custom field display names"
                        >
                          {isRefreshing ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Background Sync Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Background Sync Configuration</h2>
            <div className="flex items-center gap-2">
              {syncStatus?.isRunning ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm font-medium">Inactive</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Sync Controls */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
              <div>
                <h3 className="text-base font-medium text-gray-900">Sync Service Controls</h3>
                <p className="text-sm text-gray-600 mt-1">Manage background synchronization for Zendesk and Jira (every 15 minutes)</p>
              </div>
              <div className="flex items-center gap-3">
                {syncStatus?.isRunning ? (
                  <button
                    onClick={stopBackgroundService}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                    Stop Service
                  </button>
                ) : (
                  <button
                    onClick={startBackgroundService}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    Start Service
                  </button>
                )}
                <button
                  onClick={triggerManualSync}
                  disabled={isManualSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  Manual Sync (Both)
                </button>
              </div>
            </div>

            {/* Sync Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {syncStatus?.lastSync ? (
                    new Date(syncStatus.lastSync).toLocaleTimeString()
                  ) : (
                    'Never'
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">Last Sync</div>
                {syncStatus?.lastSync && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(syncStatus.lastSync).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {syncStatus?.stats?.totalRecords || 0}
                </div>
                <div className="text-sm text-blue-600 mt-1">Total Records</div>
                <div className="text-xs text-blue-500 mt-1">
                  {syncStatus?.stats?.recordsToday || 0} today
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">
                  {syncStatus?.recentLogs?.length || 0}
                </div>
                <div className="text-sm text-purple-600 mt-1">Recent Syncs</div>
                <div className="text-xs text-purple-500 mt-1">
                  Last 5 operations
                </div>
              </div>

              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">
                  {syncStatus?.stats?.consecutiveErrors || 0}
                </div>
                <div className="text-sm text-yellow-600 mt-1">Consecutive Errors</div>
                <div className="text-xs text-yellow-500 mt-1">
                  {syncStatus?.stats?.consecutiveErrors ? 'Needs attention' : 'All good'}
                </div>
              </div>
            </div>
            
            {/* Recent Sync Logs */}
            {syncStatus?.recentLogs && syncStatus.recentLogs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Sync Activity (Zendesk & Jira)</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {syncStatus.recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          log.status === 'success' ? 'bg-green-500' : 
                          log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              {log.message || log.status}
                            </div>
                            {log.system && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                log.system === 'Zendesk' ? 'bg-green-100 text-green-800' : 
                                log.system === 'Jira' ? 'bg-blue-100 text-blue-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.system}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.syncedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {log.recordsProcessed > 0 && `${log.recordsProcessed} records`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Field Mappings Management */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Field Mappings</h2>
            <button
              onClick={() => setShowAddMapping(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Mapping
            </button>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200">
            {(mappings || []).length === 0 ? (
              <div className="text-center py-12">
                <Link className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg font-medium">No field mappings configured</p>
                <p className="text-gray-500 text-sm mt-2">Create connections between fields in different systems</p>
                <button
                  onClick={() => setShowAddMapping(true)}
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                >
                  Create your first mapping
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {(mappings || []).map((mapping) => (
                  <div key={mapping.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {mapping.sourceSystem}
                          </span>
                          <span className="text-sm text-gray-600 font-mono">
                            {mapping.sourceField}
                          </span>
                        </div>
                        
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 font-mono">
                            {mapping.targetField}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {mapping.targetSystem}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {mapping.mappingName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {mapping.isActive ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-gray-400">Inactive</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedMapping(mapping)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            title="Edit mapping"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              console.log('Delete button clicked for mapping:', mapping);
                              setMappingToDelete(mapping);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete mapping"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
                  <select 
                    value={sourceSystem}
                    onChange={(e) => {
                      setSourceSystem(e.target.value);
                      setSourceField(''); // Reset field when system changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option>Zendesk</option>
                    <option>Jira</option>
                    <option>Slack</option>
                    <option>GitHub</option>
                    <option>Salesforce</option>
                    <option>Teams</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Source Field</label>
                  <select 
                    value={sourceField}
                    onChange={(e) => setSourceField(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    disabled={loadingSourceFields || sourceFields.length === 0}
                  >
                    {loadingSourceFields ? (
                      <option>Loading fields...</option>
                    ) : sourceFields.length === 0 ? (
                      <option>No fields available</option>
                    ) : (
                      <>
                        <option value="">Select a field</option>
                        {sourceFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.title} {field.type === 'custom' ? '(Custom)' : ''}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <ArrowRight className="w-6 h-6 text-gray-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Target System</label>
                  <select 
                    value={targetSystem}
                    onChange={(e) => {
                      setTargetSystem(e.target.value);
                      setTargetField(''); // Reset field when system changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option>Jira</option>
                    <option>Zendesk</option>
                    <option>Slack</option>
                    <option>GitHub</option>
                    <option>Salesforce</option>
                    <option>Teams</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Target Field</label>
                  <select 
                    value={targetField}
                    onChange={(e) => setTargetField(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    disabled={loadingTargetFields || targetFields.length === 0}
                  >
                    {loadingTargetFields ? (
                      <option>Loading fields...</option>
                    ) : targetFields.length === 0 ? (
                      <option>No fields available</option>
                    ) : (
                      <>
                        <option value="">Select a field</option>
                        {targetFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.title} {field.type === 'custom' ? '(Custom)' : ''}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Mapping Name</label>
                <input
                  type="text"
                  value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  placeholder="e.g., Support Escalation Tracking"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Field Transformations */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Field Transformations</h4>
                <p className="text-xs text-gray-600">
                  Configure transformations to extract or modify field values before matching (e.g., extract issue key from URL).
                </p>
                
                <FieldTransformationConfig
                  value={sourceTransform}
                  onChange={setSourceTransform}
                  fieldType="source"
                  label="Source"
                />
                
                <FieldTransformationConfig
                  value={targetTransform}
                  onChange={setTargetTransform}
                  fieldType="target"
                  label="Target"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddMapping(false)}
                className="px-4 py-2 text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Validate required fields
                    if (!sourceSystem || !sourceField || !targetSystem || !targetField || !mappingName.trim()) {
                      addError('All fields are required');
                      return;
                    }

                    // Call createMapping
                    await createMapping({
                      sourceSystem,
                      sourceField,
                      targetSystem,
                      targetField,
                      mappingName: mappingName.trim(),
                      sourceTransform: sourceTransform?.config,
                      targetTransform: targetTransform?.config,
                      transformationType: sourceTransform?.transformationType || targetTransform?.transformationType
                    });

                    // Reset form and close modal
                    setSourceSystem('Zendesk');
                    setSourceField('');
                    setTargetSystem('Jira');
                    setTargetField('');
                    setMappingName('');
                    setSourceTransform(null);
                    setTargetTransform(null);
                    setSourceFields([]);
                    setTargetFields([]);
                    setShowAddMapping(false);
                  } catch (error) {
                    console.error('Error creating mapping:', error);
                    addError('Failed to create mapping');
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
              >
                Create Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!mappingToDelete}
        onClose={() => setMappingToDelete(null)}
        title="Delete Field Mapping"
      >
        {mappingToDelete && (
          <>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the mapping &quot;{mappingToDelete.mappingName}&quot;?
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                {mappingToDelete.sourceSystem}.{mappingToDelete.sourceField} → {mappingToDelete.targetSystem}.{mappingToDelete.targetField}
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setMappingToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteMapping}
              >
                Delete Mapping
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Zendesk Configuration Modal */}
      <ZendeskConfigModal
        isOpen={showZendeskConfig}
        onClose={() => setShowZendeskConfig(false)}
      />

      {/* Jira Configuration Modal */}
      <JiraConfigModal
        isOpen={showJiraConfig}
        onClose={() => setShowJiraConfig(false)}
      />
    </div>
  );
};

export default SettingsPage;