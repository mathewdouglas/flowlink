// Record field utility functions for extracting values from records

/**
 * Get field value from a record, handling various field formats and custom fields
 * @param {Object} record - The record object
 * @param {string} field - Field name (e.g., 'status', 'zendesk.custom_123456789')
 * @returns {*} - Field value or empty string if not found
 */
export const getRecordFieldValue = (record, field) => {
  // Extract the actual field name from prefixed fields (e.g., 'zendesk.status' -> 'status')
  let actualField = field;
  if (field.includes('.')) {
    actualField = field.split('.').pop(); // Get the last part after the dot
  }
  
  switch (actualField) {
    case 'id':
    case 'key':
    case 'number':
    case 'case_number':
    case 'message_id':
      return record.sourceId;
    case 'subject':
    case 'summary':
    case 'title':
      return record.title;
    case 'description':
      return record.description;
    case 'status':
    case 'state':
      return record.status;
    case 'priority':
      return record.priority;
    case 'assignee':
    case 'owner':
      return record.assigneeName || record.assigneeEmail;
    case 'reporter':
    case 'requester':
    case 'author':
    case 'user':
    case 'from':
      return record.reporterName || record.reporterEmail;
    case 'created_at':
    case 'created':
    case 'timestamp':
    case 'created_datetime':
      return record.sourceCreatedAt;
    case 'updated_at':
    case 'updated':
      return record.sourceUpdatedAt;
    default:
      // Handle Zendesk custom fields (format: zendesk.custom_123456789)
      if (field.startsWith('zendesk.custom_')) {
        const fieldId = field.substring(15); // Remove 'zendesk.custom_' prefix
        try {
          const customFields = record.customFields || {}; // Already parsed by API
          return customFields[fieldId] !== undefined && customFields[fieldId] !== null ? customFields[fieldId] : '';
        } catch {
          return '';
        }
      }
      // Handle other Zendesk fields from customFields
      if (field.startsWith('zendesk.')) {
        const fieldName = field.substring(8); // Remove 'zendesk.' prefix
        try {
          const customFields = record.customFields || {}; // Already parsed by API
          return customFields[fieldName] !== undefined && customFields[fieldName] !== null ? customFields[fieldName] : '';
        } catch {
          return '';
        }
      }
      // Handle Zendesk custom fields (format: custom_123456789)
      if (field.startsWith('custom_')) {
        const fieldId = field.substring(7); // Remove 'custom_' prefix
        try {
          const customFields = record.customFields || {}; // Already parsed by API
          return customFields[fieldId] !== undefined && customFields[fieldId] !== null ? customFields[fieldId] : '';
        } catch {
          return '';
        }
      }
      // Handle custom columns (format: custom.column_name)
      if (field.startsWith('custom.')) {
        const fieldName = field.substring(7); // Remove 'custom.' prefix
        try {
          const customFields = record.customFields || {}; // Already parsed by API
          const value = customFields[fieldName];
          return value !== undefined && value !== null ? value : '';
        } catch {
          return '';
        }
      }
      // Try other custom fields
      try {
        const customFields = record.customFields || {}; // Already parsed by API
        return customFields[field];
      } catch {
        return '';
      }
  }
};

/**
 * Safely get custom fields as an object from a record
 * @param {Object} record - The record object
 * @returns {Object} - Custom fields object or empty object if parsing fails
 */
export const getCustomFields = (record) => {
  try {
    return typeof record.customFields === 'string' 
      ? JSON.parse(record.customFields) 
      : (record.customFields || {});
  } catch (error) {
    console.warn('Error parsing custom fields:', error);
    return {};
  }
};

/**
 * For a given column, find the record (main or linked) whose sourceSystem matches the column's system
 * @param {Object} record - The main record object
 * @param {string} columnKey - Column key (e.g., 'zendesk.status')
 * @returns {Object} - The record that matches the column's system
 */
export const getCellRecordForColumn = (record, columnKey) => {
  const [system] = columnKey.split('.');
  if (record.sourceSystem === system) return record;
  if (record.linkedRecords && record.linkedRecords.length > 0) {
    const match = record.linkedRecords.find(lr => lr.sourceSystem === system);
    if (match) return match;
  }
  return record; // fallback
};