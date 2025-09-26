/**
 * Field transformation utilities for extracting and transforming field values
 * Used in field mappings to enable partial field matching and value extraction
 */

/**
 * Apply transformation to a field value
 * @param {*} value - The original field value
 * @param {string} transformationType - Type of transformation ('regex', 'extract_url_path', 'custom', etc.)
 * @param {Object} transformConfig - Configuration for the transformation
 * @returns {*} - Transformed value or original value if transformation fails
 */
export function applyFieldTransformation(value, transformationType, transformConfig) {
  if (!value || !transformationType) {
    return value;
  }

  try {
    switch (transformationType) {
      case 'extract_jira_key':
        return extractJiraKeyFromUrl(value);
      
      case 'regex_extract':
        return extractWithRegex(value, transformConfig);
      
      case 'url_path_extract':
        return extractUrlPath(value, transformConfig);
      
      case 'substring':
        return extractSubstring(value, transformConfig);
      
      case 'split_extract':
        return extractFromSplit(value, transformConfig);
      
      default:
        console.warn(`Unknown transformation type: ${transformationType}`);
        return value;
    }
  } catch (error) {
    console.error('Field transformation error:', error);
    return value; // Return original value on error
  }
}

/**
 * Extract Jira issue key from URL (specific case for MRI Pride Jira links)
 * Extracts "PAL-14571" from "https://mripride.atlassian.net/browse/PAL-14571"
 */
function extractJiraKeyFromUrl(url) {
  if (typeof url !== 'string') return url;
  
  const jiraKeyRegex = /\/browse\/([A-Z]+-\d+)/i;
  const match = url.match(jiraKeyRegex);
  return match ? match[1] : url;
}

/**
 * Extract value using regular expression
 * @param {string} value - Input value
 * @param {Object} config - {pattern: string, group?: number}
 */
function extractWithRegex(value, config) {
  if (typeof value !== 'string' || !config.pattern) return value;
  
  const regex = new RegExp(config.pattern, 'i');
  const match = value.match(regex);
  
  if (match) {
    const groupIndex = config.group || 1; // Default to first capture group
    return match[groupIndex] || match[0];
  }
  
  return value;
}

/**
 * Extract part of URL path
 * @param {string} url - Input URL
 * @param {Object} config - {pathIndex?: number, fromEnd?: boolean}
 */
function extractUrlPath(url, config) {
  if (typeof url !== 'string') return url;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length === 0) return url;
    
    const index = config.pathIndex || -1; // Default to last path segment
    if (config.fromEnd) {
      return pathParts[pathParts.length - 1 + index] || url;
    } else {
      return pathParts[index] || url;
    }
  } catch (error) {
    return value;
  }
}

/**
 * Extract substring
 * @param {string} value - Input value
 * @param {Object} config - {start?: number, end?: number, length?: number}
 */
function extractSubstring(value, config) {
  if (typeof value !== 'string') return value;
  
  const start = config.start || 0;
  if (config.length !== undefined) {
    return value.substring(start, start + config.length);
  } else if (config.end !== undefined) {
    return value.substring(start, config.end);
  }
  
  return value.substring(start);
}

/**
 * Extract value from split operation
 * @param {string} value - Input value  
 * @param {Object} config - {separator: string, index: number}
 */
function extractFromSplit(value, config) {
  if (typeof value !== 'string' || !config.separator) return value;
  
  const parts = value.split(config.separator);
  const index = config.index || 0;
  
  return parts[index] || value;
}

/**
 * Get transformation configuration for common patterns
 */
export function getTransformationPresets() {
  return {
    'extract_jira_key': {
      name: 'Extract Jira Issue Key',
      description: 'Extract issue key from Jira URL (e.g., PAL-14571 from https://mripride.atlassian.net/browse/PAL-14571)',
      config: null // No config needed for this preset
    },
    'regex_extract': {
      name: 'Regular Expression Extract',
      description: 'Extract text using a regular expression pattern',
      config: {
        pattern: '',
        group: 1
      }
    },
    'url_path_extract': {
      name: 'URL Path Extract',
      description: 'Extract part of a URL path',
      config: {
        pathIndex: -1,
        fromEnd: true
      }
    },
    'substring': {
      name: 'Substring Extract',
      description: 'Extract a portion of text by position',
      config: {
        start: 0,
        length: null
      }
    },
    'split_extract': {
      name: 'Split and Extract',
      description: 'Split text by separator and extract specific part',
      config: {
        separator: '',
        index: 0
      }
    }
  };
}

/**
 * Test a transformation with sample data
 */
export function testTransformation(sampleValue, transformationType, transformConfig) {
  try {
    const result = applyFieldTransformation(sampleValue, transformationType, transformConfig);
    return {
      success: true,
      result,
      original: sampleValue
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      original: sampleValue
    };
  }
}