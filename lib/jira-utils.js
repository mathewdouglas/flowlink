// Jira utility functions

/**
 * Construct a full Jira URL from a subdomain
 * @param {string} subdomain - The Jira subdomain (e.g., 'mycompany')
 * @returns {string} - The full Jira URL (e.g., 'https://mycompany.atlassian.net')
 */
export function constructJiraUrl(subdomain) {
  if (!subdomain) {
    throw new Error('Subdomain is required');
  }
  return `https://${subdomain}.atlassian.net`;
}

/**
 * Extract subdomain from a Jira URL
 * @param {string} url - The full Jira URL
 * @returns {string|null} - The extracted subdomain, or null if not a valid Jira URL
 */
export function extractSubdomainFromUrl(url) {
  if (!url) return null;
  
  const match = url.match(/https:\/\/(.+?)\.atlassian\.net/);
  return match ? match[1] : null;
}

/**
 * Validate a Jira subdomain format
 * @param {string} subdomain - The subdomain to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidJiraSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== 'string') {
    return false;
  }
  
  // Subdomain should contain only letters, numbers, and hyphens
  // Must start and end with alphanumeric characters
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  return pattern.test(subdomain) && subdomain.length >= 1 && subdomain.length <= 63;
}

/**
 * Get Jira API base URL from subdomain
 * @param {string} subdomain - The Jira subdomain
 * @returns {string} - The API base URL
 */
export function getJiraApiBaseUrl(subdomain) {
  return `${constructJiraUrl(subdomain)}/rest/api/3`;
}

/**
 * Create Jira API headers with authentication
 * @param {string} username - Username or email
 * @param {string} apiToken - API token
 * @returns {object} - Headers object for fetch requests
 */
export function createJiraAuthHeaders(username, apiToken) {
  const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
}

/**
 * Build JQL query string with filters
 * @param {object} options - Filter options
 * @param {string} options.projectKey - Project key to filter by
 * @param {string} options.components - Comma-separated component names
 * @param {boolean} options.excludeClosedIssues - Whether to exclude closed issues
 * @param {string} options.additionalJql - Additional JQL to append
 * @returns {string} - JQL query string
 */
export function buildJqlQuery(options = {}) {
  const { projectKey, components, excludeClosedIssues, additionalJql } = options;
  const conditions = [];

  // Project filter
  if (projectKey) {
    conditions.push(`project = "${projectKey}"`);
  }

  // Component filter
  if (components) {
    const componentList = components.split(',').map(c => c.trim()).filter(Boolean);
    if (componentList.length > 0) {
      if (componentList.length === 1) {
        conditions.push(`component = "${componentList[0]}"`);
      } else {
        const componentConditions = componentList.map(c => `"${c}"`).join(', ');
        conditions.push(`component in (${componentConditions})`);
      }
    }
  }

  // Status filter (exclude closed issues)
  if (excludeClosedIssues) {
    conditions.push('status not in (Closed, Resolved, Done, Cancel)');
  }

  // Additional JQL
  if (additionalJql) {
    conditions.push(`(${additionalJql})`);
  }

  return conditions.join(' AND ');
}

/**
 * Get Jira issues using JQL with pagination
 * @param {string} baseUrl - Jira base URL
 * @param {object} headers - Authentication headers
 * @param {string} jql - JQL query
 * @param {object} options - Query options
 * @returns {Promise<object>} - Jira search response
 */
export async function searchJiraIssues(baseUrl, headers, jql, options = {}) {
  const { startAt = 0, maxResults = 50, fields } = options;
  
  const params = new URLSearchParams({
    jql,
    startAt: startAt.toString(),
    maxResults: maxResults.toString()
  });

  if (fields) {
    params.append('fields', fields);
  }

  const fullUrl = `${baseUrl}/rest/api/3/search/jql?${params}`;
  console.log('Making Jira API call to:', fullUrl);

  const response = await fetch(fullUrl, {
    headers,
    timeout: 10000
  });

  if (!response.ok) {
    console.error('Jira API error response:', {
      status: response.status,
      statusText: response.statusText,
      url: fullUrl
    });
    throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}