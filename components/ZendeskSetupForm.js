import React from 'react';

export default function ZendeskSetupForm() {
  const [subdomain, setSubdomain] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle | saving | success | error
  const [errors, setErrors] = React.useState({});
  const [errorMessage, setErrorMessage] = React.useState('');

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
        body: JSON.stringify({ subdomain, email, apiKey, searchQuery })
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => window.location.reload(), 1200);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <span className="text-xs text-gray-500">https://yourcompany.zendesk.com</span>
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
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">Zendesk API Token</label>
        <input
          type="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          placeholder="API token"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          required
        />
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
        {errors.searchQuery && <div className="text-xs text-red-600 mt-1 font-medium">{errors.searchQuery}</div>}
      </div>
      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
        disabled={status === 'saving'}
      >
        {status === 'saving' ? 'Testing Connection...' : 'Test & Save Connection'}
      </button>
      {status === 'success' && (
        <div className="text-green-700 text-center text-sm mt-2 font-semibold">Connection successful! Credentials saved.</div>
      )}
      {status === 'error' && (
        <div className="text-red-700 text-center text-sm mt-2 font-semibold">
          {errorMessage || 'Failed to save credentials.'}
        </div>
      )}
    </form>
  );
}
