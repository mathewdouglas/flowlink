import React, { useState, useEffect } from 'react';

export default function ZendeskConfigModal({ isOpen, onClose }) {
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoSolveMissingTickets, setAutoSolveMissingTickets] = useState(true);
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
      const res = await fetch('/api/zendesk/credentials');
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          setSubdomain(data.subdomain || '');
          setEmail(data.email || '');
          setIsActive(data.isActive);
          setSearchQuery(data.customConfig?.searchQuery || '');
          setAutoSolveMissingTickets(data.customConfig?.autoSolveMissingTickets !== false);
          setIsConfigured(true);
        } else {
          // No credentials configured yet
          setSubdomain('');
          setEmail('');
          setApiKey('');
          setSearchQuery('');
          setAutoSolveMissingTickets(true);
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
    if (!subdomain.trim()) errs.subdomain = 'Subdomain is required.';
    else if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) errs.subdomain = 'Only letters, numbers, and dashes allowed.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Invalid email address.';
    if (!apiKey.trim()) errs.apiKey = 'API token is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('saving');
    setErrorMessage('');
    try {
      const res = await fetch('/api/zendesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subdomain, 
          email, 
          apiKey, 
          searchQuery, 
          autoSolveMissingTickets,
          isActive 
        })
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
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {isConfigured ? 'Edit Zendesk Configuration' : 'Configure Zendesk Integration'}
          </h2>
          <p className="text-gray-600">
            {isConfigured
              ? 'Update your Zendesk API credentials and settings.'
              : 'Set up your Zendesk integration by providing your API credentials.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Zendesk Subdomain</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="yourcompany"
                value={subdomain}
                onChange={e => setSubdomain(e.target.value)}
                required
              />
              <span className="text-xs text-gray-500">https://{subdomain || 'yourcompany'}.zendesk.com</span>
              {errors.subdomain && <div className="text-xs text-red-600 mt-1 font-medium">{errors.subdomain}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Zendesk Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {errors.email && <div className="text-xs text-red-600 mt-1 font-medium">{errors.email}</div>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Zendesk API Token</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder={isConfigured ? "••••••••••••••••" : "API token"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              required={!isConfigured}
            />
            <span className="text-xs text-gray-500">
              {isConfigured
                ? "Leave blank to keep current token, or enter a new one to update"
                : "Generate an API token in your Zendesk Admin settings"
              }
            </span>
            {errors.apiKey && <div className="text-xs text-red-600 mt-1 font-medium">{errors.apiKey}</div>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Search Query (Optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="group_id:13066540343695 status<solved type:ticket"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className="text-xs text-gray-500">
              Custom search query for filtering tickets. Leave empty to fetch all tickets.
              <br />
              Example: group_id:123 status&lt;solved type:ticket
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="autoSolveMissingTickets"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={autoSolveMissingTickets}
                onChange={e => setAutoSolveMissingTickets(e.target.checked)}
              />
              <label htmlFor="autoSolveMissingTickets" className="ml-3 block text-sm text-gray-900">
                Auto-solve tickets that no longer exist in Zendesk
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-7">
              When enabled, tickets that are deleted or no longer accessible in Zendesk will be automatically marked as &quot;solved&quot; in FlowLink during sync.
            </p>
          </div>

          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Enable Zendesk integration
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer"
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