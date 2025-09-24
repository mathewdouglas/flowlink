// Data processing utility functions for records and sorting
import { getRecordFieldValue } from './recordFieldUtils.js';

/**
 * Sort records by a given column and direction
 * @param {Array} records - Array of records to sort
 * @param {string} column - Column key to sort by (e.g., 'zendesk.status')
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} - Sorted array of records
 */
export const sortRecords = (records, column, direction) => {
  if (!column) return records;

  return [...records].sort((a, b) => {
    let aValue, bValue;

    if (column === 'linkStatus') {
      // Link status sorting is handled separately after linkedRecords are processed
      aValue = a.id; // Fallback to ID for consistent ordering
      bValue = b.id;
    } else {
      const [system, field] = column.split('.');

      // Get value from the record if it matches the system, otherwise use empty string
      if (system === a.sourceSystem) {
        aValue = getRecordFieldValue(a, field);
      } else {
        aValue = '';
      }

      if (system === b.sourceSystem) {
        bValue = getRecordFieldValue(b, field);
      } else {
        bValue = '';
      }
    }

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return direction === 'asc' ? 1 : -1;
    if (bValue == null) return direction === 'asc' ? -1 : 1;

    // Convert to strings for comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (direction === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
};

/**
 * Process records with linked records information
 * @param {Array} records - Array of main records
 * @param {Array} links - Array of link objects
 * @returns {Array} - Processed records with linked records attached
 */
export const processRecordsWithLinks = (records, links) => {
  return records.map(record => {
    // Find all links where this record is either source or target - ensure links is always an array
    const safeLinks = Array.isArray(links) ? links : [];
    const recordLinks = safeLinks.filter(link => 
      link && link.sourceRecordId === record.id || link.targetRecordId === record.id
    );

    // Get linked records
    const linkedToRecords = recordLinks.map(link => {
      const linkedRecord = link.sourceRecordId === record.id 
        ? link.targetRecord 
        : link.sourceRecord;
      return {
        ...linkedRecord,
        linkType: link.linkType,
        linkName: link.linkName
      };
    });

    return {
      ...record,
      linkedRecords: linkedToRecords,
      hasLinks: linkedToRecords.length > 0
    };
  });
};