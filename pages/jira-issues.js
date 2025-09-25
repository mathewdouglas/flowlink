"use client"

import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock, User, Calendar, Component, Filter } from 'lucide-react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';

const JiraIssuesPage = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({});
  const [syncing, setSyncing] = useState(false);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jira/issues');
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues || []);
        setFilters(data.filters || {});
        setLastSync(data.lastSync ? new Date(data.lastSync) : null);
        setPagination({
          total: data.total || 0,
          startAt: data.startAt || 0,
          maxResults: data.maxResults || 50
        });
        setLastFetch(new Date());
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to fetch issues');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/jira/sync', { method: 'POST' });
      if (res.ok) {
        // Wait a moment then refresh data
        setTimeout(() => {
          fetchIssues();
        }, 2000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to trigger sync');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status || !status.category) return 'text-gray-800 bg-gray-100';
    
    switch (status.category.toLowerCase()) {
      case 'done':
        return 'text-green-800 bg-green-100';
      case 'in progress':
        return 'text-blue-800 bg-blue-100';
      case 'to do':
      case 'new':
        return 'text-yellow-800 bg-yellow-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    if (!priority || !priority.name) return 'text-gray-800 bg-gray-100';
    
    const normalizedPriority = priority.name.toLowerCase();
    switch (normalizedPriority) {
      case 'highest':
      case 'critical':
        return 'text-red-800 bg-red-100';
      case 'high':
        return 'text-orange-800 bg-orange-100';
      case 'medium':
      case 'normal':
        return 'text-blue-800 bg-blue-100';
      case 'low':
      case 'lowest':
        return 'text-green-800 bg-green-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Head>
        <title>Jira Issues - FlowLink</title>
        <meta name="description" content="View and manage Jira issues" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Jira Issues</h1>
              <p className="text-gray-600 mt-1">
                {pagination.total} total issues ({issues.length} shown)
                {lastSync && (
                  <span className="ml-2">
                    • Last synced: {formatDate(lastSync)}
                  </span>
                )}
                {lastFetch && (
                  <span className="ml-2">
                    • Page loaded: {formatDate(lastFetch)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={triggerSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <Link 
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={fetchIssues}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <div className="px-6 py-6">
          {/* Active Filters Display */}
          {(filters.projectKey || filters.components || filters.excludeClosedIssues !== undefined) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-2">
                <Filter className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">Active Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Project:</span>
                  <span className="ml-2 text-gray-900">
                    {filters.projectKey || 'All projects'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Component className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="font-medium text-gray-700">Components:</span>
                  <span className="ml-2 text-gray-900">
                    {filters.components || 'All components'}
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 text-gray-900">
                    {filters.excludeClosedIssues ? 'Open issues only' : 'All statuses'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && !issues.length && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Jira issues...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Error Loading Issues</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                  <p className="text-red-600 text-sm mt-2">
                    Make sure your Jira credentials are properly configured in the dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && issues.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Component className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
              <p className="text-gray-600 mb-6">
                Either you have no issues in Jira that match the current filters or there&apos;s an issue with your connection.
              </p>
              <button
                onClick={fetchIssues}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {/* Issues Table */}
          {!loading && !error && issues.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Issue Key
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Summary
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Assignee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Components
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {issues.map((issue) => (
                      <tr key={issue.key} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {issue.issueType.iconUrl && (
                              <Image 
                                src={issue.issueType.iconUrl} 
                                alt={issue.issueType.name}
                                width={16}
                                height={16}
                                className="w-4 h-4 mr-2"
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900">{issue.key}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 font-medium max-w-xs truncate">
                            {issue.summary || 'No Summary'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {issue.project.name}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(issue.status)}`}>
                            {issue.status?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(issue.priority)}`}>
                            {issue.priority?.name || 'Normal'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {issue.issueType.iconUrl && (
                              <Image 
                                src={issue.issueType.iconUrl} 
                                alt={issue.issueType.name}
                                width={16}
                                height={16}
                                className="w-4 h-4 mr-2"
                              />
                            )}
                            <span className="text-sm text-gray-900">{issue.issueType.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {issue.assignee?.displayName || 'Unassigned'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {issue.components.length > 0 ? (
                              issue.components.map((component, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-md"
                                >
                                  <Component className="h-3 w-3 mr-1" />
                                  {component.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {formatDate(issue.created)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {formatDate(issue.updated)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => window.open(issue.url, '_blank')}
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                            title="Open in Jira"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default JiraIssuesPage;