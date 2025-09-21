import React, { useState, useEffect } from 'react';

export default function JiraConfigModal({ isOpen, onClose }) {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | loading | saving | success | error
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Load current credentials when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCurrentCredentials();
    }
  }, [isOpen]);

  const loadCurrentCredentials = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/jira/credentials');
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          setUrl(data.url || '');
          setUsername(data.username || '');
          setIsActive(data.isActive);
          setProjectKey(data.customConfig?.projectKey || '');
          setIsConfigured(true);
        } else {
          // No credentials configured yet
          setUrl('');
          setUsername('');
          setApiToken('');
          setProjectKey('');
          setIsActive(true);
          setIsConfigured(false);
        }
      } else {
        setErrorMessage('Failed to load current credentials');
      }
    } catch (err) {
      setErrorMessage('Network error: ' + err.message);
    } finally {
      setStatus('idle');
    }
  };

  const validate = () => {
    const errs = {};
    if (!url.trim()) errs.url = 'Jira URL is required.';
    else if (!/^https?:\/\/.+/.test(url)) errs.url = 'Must be a valid HTTP/HTTPS URL.';
    if (!username.trim()) errs.username = 'Username/Email is required.';
    if (!apiToken.trim()) errs.apiToken = 'API token is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('saving');
    setErrorMessage('');
    try {
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, username, apiToken, projectKey, isActive })
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          window.location.reload(); // Refresh to update status
        }, 1200);
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.error || 'Failed to save credentials');
        setStatus('error');
      }
    } catch (err) {
      setErrorMessage('Network error: ' + err.message);
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {isConfigured ? 'Edit Jira Configuration' : 'Configure Jira Integration'}
          </h2>
          <p className="text-gray-600">
            {isConfigured
              ? 'Update your Jira API credentials and settings.'
              : 'Set up your Jira integration by providing your API credentials.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-800 mb-1">Jira URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="https://yourcompany.atlassian.net"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
              <span className="text-xs text-gray-500">Your Jira instance URL</span>
              {errors.url && <div className="text-xs text-red-600 mt-1 font-medium">{errors.url}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Username/Email</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="user@company.com"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              {errors.username && <div className="text-xs text-red-600 mt-1 font-medium">{errors.username}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">API Token</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder={isConfigured ? "••••••••••••••••" : "API token"}
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                required={!isConfigured}
              />
              <span className="text-xs text-gray-500">
                {isConfigured
                  ? "Leave blank to keep current token, or enter a new one to update"
                  : "Generate an API token in your Atlassian account settings"
                }
              </span>
              {errors.apiToken && <div className="text-xs text-red-600 mt-1 font-medium">{errors.apiToken}</div>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Project Key (Optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="PROJ"
              value={projectKey}
              onChange={e => setProjectKey(e.target.value)}
            />
            <span className="text-xs text-gray-500">
              Filter issues to a specific project. Leave empty to sync all accessible projects.
            </span>
          </div>

          <div className="flex items-center">
            <input
              id="jira-isActive"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <label htmlFor="jira-isActive" className="ml-2 block text-sm text-gray-900">
              Enable Jira integration
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              disabled={status === 'saving' || status === 'loading'}
            >
              {status === 'saving' ? 'Testing Connection...' :
               status === 'loading' ? 'Loading...' :
               isConfigured ? 'Update Configuration' : 'Test & Save Connection'}
            </button>
          </div>

          {status === 'success' && (
            <div className="text-green-700 text-center text-sm mt-4 font-semibold bg-green-50 p-3 rounded-lg">
              Configuration {isConfigured ? 'updated' : 'saved'} successfully!
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-700 text-center text-sm mt-4 font-semibold bg-red-50 p-3 rounded-lg">
              {errorMessage || 'Failed to save configuration.'}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}