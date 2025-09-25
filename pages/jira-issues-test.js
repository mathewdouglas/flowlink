"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { RefreshCw, AlertCircle, Filter, Component, CheckSquare } from 'lucide-react';

export default function JiraIssuesTest() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({});

  const fetchIssues = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/jira/issues');
      const data = await response.json();
      
      if (response.ok) {
        setIssues(data.issues);
        setFilters(data.filters);
        setPagination({
          total: data.total,
          startAt: data.startAt,
          maxResults: data.maxResults
        });
      } else {
        setError(data.error || 'Failed to fetch issues');
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

  if (loading && issues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading Jira issues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="font-semibold text-red-800">Error Loading Issues</h3>
          </div>
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchIssues}
            className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jira Issues Test</h1>
            <p className="text-sm text-gray-600 mt-1">
              Testing component and status filtering
            </p>
          </div>
          <button
            onClick={fetchIssues}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="p-6">
        {/* Filters Info */}
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
              <CheckSquare className="h-4 w-4 text-gray-500 mr-1" />
              <span className="font-medium text-gray-700">Status:</span>
              <span className="ml-2 text-gray-900">
                {filters.excludeClosedIssues ? 'Open issues only' : 'All statuses'}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Found {pagination.total} total issues
          </div>
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {issues.map((issue) => (
            <div key={issue.key} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {issue.issueType.iconUrl && (
                      <Image 
                        src={issue.issueType.iconUrl} 
                        alt={issue.issueType.name}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    )}
                  </div>
                  <div>
                    <a 
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      {issue.key}
                    </a>
                    <div className="text-sm text-gray-500">
                      {issue.project.name} • {issue.issueType.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    issue.status.category === 'Done' ? 'bg-green-100 text-green-800' :
                    issue.status.category === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {issue.status.name}
                  </span>
                  {issue.priority.name && (
                    <span className="text-xs text-gray-500">
                      {issue.priority.name}
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {issue.summary}
              </h3>

              {issue.components.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {issue.components.map((component, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-md"
                    >
                      <Component className="h-3 w-3 mr-1" />
                      {component.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  {issue.assignee && (
                    <div className="flex items-center">
                      <span className="mr-1">Assigned to:</span>
                      <span className="font-medium">{issue.assignee.displayName}</span>
                    </div>
                  )}
                  <div>
                    Updated: {new Date(issue.updated).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {issues.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Component className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
            <p className="text-gray-600">
              No issues match the current filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}