// Color and styling utility functions for UI components

/**
 * Get system color based on source system
 * @param {string} system - System name (e.g., 'zendesk', 'jira')
 * @returns {string} - Color name for the system
 */
export const getSystemColor = (system) => {
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

/**
 * Get priority color classes for styling
 * @param {string} priority - Priority level (e.g., 'Critical', 'High')
 * @returns {string} - CSS classes for priority styling
 */
export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Critical': return 'text-red-800 bg-red-100 border-red-200';
    case 'High': return 'text-orange-800 bg-orange-100 border-orange-200';
    case 'Medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
    case 'Low': return 'text-green-800 bg-green-100 border-green-200';
    default: return 'text-gray-800 bg-gray-100 border-gray-200';
  }
};

/**
 * Get status color classes based on status and system
 * @param {string} status - Status value
 * @param {string} system - System name for context-specific colors
 * @returns {string} - CSS classes for status styling
 */
export const getStatusColor = (status, system) => {
  if (!status) return 'text-gray-800 bg-gray-100';
  const normalizedStatus = String(status).toLowerCase();
  
  if (system === 'zendesk') {
    switch (normalizedStatus) {
      case 'new': return 'text-orange-800 bg-orange-100'; // Orange
      case 'open': return 'text-red-800 bg-red-100'; // Red
      case 'pending': return 'text-blue-800 bg-blue-100'; // Blue
      case 'on hold': return 'text-white bg-gray-800'; // Black
      case 'solved': return 'text-gray-800 bg-gray-200'; // Grey
      case 'closed': return 'text-gray-800 bg-gray-200'; // Grey
      default: return 'text-gray-800 bg-gray-100';
    }
  } else if (system === 'jira') {
    switch (normalizedStatus) {
      case 'open': return 'text-gray-800 bg-gray-200'; // Grey
      case 'under review': return 'text-blue-800 bg-blue-100'; // Blue
      case 'in progress': return 'text-blue-800 bg-blue-100'; // Blue
      case 'solution provided': return 'text-blue-800 bg-blue-100'; // Blue
      case 'done': return 'text-green-800 bg-green-100'; // Green
      default: return 'text-gray-800 bg-gray-100';
    }
  } else {
    // Fallback for other systems
    switch (normalizedStatus) {
      case 'open': return 'text-blue-800 bg-blue-100';
      case 'in progress': return 'text-orange-800 bg-orange-100';
      case 'review': return 'text-purple-800 bg-purple-100';
      case 'resolved':
      case 'done': return 'text-green-800 bg-green-100';
      case 'pending': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  }
};