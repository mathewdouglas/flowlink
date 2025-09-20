"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, AlertCircle, CheckCircle, Clock, X, Link, ArrowRight, Eye, EyeOff, Plus, Edit3, Trash2, Play, Square, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useRecordLinks, useFieldMappings } from '../hooks/useRecordLinking';
import { useSyncService } from '../hooks/useSyncService';
import { useErrors } from '../context/AppContext';
import { LoadingSpinner, ErrorMessage, Modal, Button, Card } from '../components/UI/CommonComponents';
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
  
  // Error handling
  const { addError } = useErrors();

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Connected systems state
  const [connectedSystems, setConnectedSystems] = useState([
    { id: 1, name: 'Zendesk', type: 'support', status: 'connected', color: 'bg-green-500' },
    { id: 2, name: 'Jira', type: 'project', status: 'connected', color: 'bg-blue-500' },
    { id: 3, name: 'Slack', type: 'communication', status: 'error', color: 'bg-red-500' },
    { id: 4, name: 'GitHub', type: 'development', status: 'connected', color: 'bg-gray-800' },
    { id: 5, name: 'Salesforce', type: 'crm', status: 'pending', color: 'bg-blue-600' },
    { id: 6, name: 'Teams', type: 'communication', status: 'connected', color: 'bg-purple-600' }
  ]);

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
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
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
              <div key={system.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
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
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Configure
                  </button>
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
                <p className="text-sm text-gray-600 mt-1">Manage the background synchronization service</p>
              </div>
              <div className="flex items-center gap-3">
                {syncStatus?.isRunning ? (
                  <button
                    onClick={stopBackgroundService}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Stop Service
                  </button>
                ) : (
                  <button
                    onClick={startBackgroundService}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start Service
                  </button>
                )}
                <button
                  onClick={triggerManualSync}
                  disabled={isManualSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  Manual Sync
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
                <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Sync Activity</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {syncStatus.recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          log.status === 'success' ? 'bg-green-500' : 
                          log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.message || log.status}
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
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
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
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit mapping"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMapping(mapping.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
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
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
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
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option>id</option>
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
                    <option>Slack</option>
                    <option>GitHub</option>
                    <option>Salesforce</option>
                    <option>Teams</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500"
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;