import React, { useState } from 'react';
import { 
  Link, 
  X, 
  ExternalLink, 
  Settings, 
  ChevronUp, 
  ChevronDown, 
  Edit3 
} from 'lucide-react';

// Utility function to truncate long text with ellipsis
const truncateText = (text, maxLength = 50) => {
  if (!text || typeof text !== 'string') return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

const RecordTable = ({
  // Data
  linkedRecords,
  currentColumnMetadata,
  
  // Sorting
  sortColumn,
  sortDirection,
  handleSort,
  getSortIndicator,
  
  // Columns
  getVisibleColumnsInOrder,
  
  // Table cell rendering
  renderTableCell,
  getCellRecordForColumn,
  
  // Editing
  editingCell,
  setEditingCell,
  editingValue,
  setEditingValue,
  isSavingEdit,
  startEditing,
  saveCustomFieldEdit,
  
  // Utility functions
  getCustomFields,
  getStatusColor,
  getSystemColor,
  
  // Handle key press for editing
  handleKeyPress
}) => {
  return (
    <div className="space-y-6">
      {/* Unified Linked Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('linkStatus')}
                >
                  Link Status
                  {getSortIndicator('linkStatus')}
                </th>
                {getVisibleColumnsInOrder().map(columnKey => {
                  const meta = currentColumnMetadata[columnKey];
                  
                  // Skip if metadata doesn't exist for this column
                  if (!meta) {
                    console.warn(`No metadata found for column: ${columnKey}`);
                    return null;
                  }
                  
                  const getColorClass = (color) => {
                    switch(color) {
                      case 'green': return 'text-green-700';
                      case 'blue': return 'text-blue-700';
                      case 'red': return 'text-red-700';
                      case 'gray': return 'text-gray-700';
                      case 'purple': return 'text-purple-700';
                      case 'indigo': return 'text-indigo-700';
                      default: return 'text-gray-700';
                    }
                  };
                  
                  const getColumnWidth = (columnKey) => {
                    const [, field] = columnKey.split('.');
                    if (field === 'subject' || field === 'summary' || field === 'title' || field === 'description') {
                      return 'max-w-xs'; // Max width for text-heavy columns
                    }
                    return '';
                  };
                  
                  return (
                    <th 
                      key={columnKey} 
                      className={`px-4 py-3 text-left text-xs font-medium ${getColorClass(meta.color || 'gray')} uppercase tracking-wider ${getColumnWidth(columnKey)} cursor-pointer hover:bg-gray-100 select-none`}
                      onClick={() => handleSort(columnKey)}
                    >
                      {meta.label}
                      {getSortIndicator(columnKey)}
                    </th>
                  );
                }).filter(Boolean)}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {linkedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-2 whitespace-nowrap align-middle">
                    {record.hasLinks ? (
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">
                          Linked ({record.linkedRecords.length})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-700 font-medium">Unlinked</span>
                      </div>
                    )}
                  </td>
                  {getVisibleColumnsInOrder().map(columnKey => {
                    const cellRecord = getCellRecordForColumn(record, columnKey);
                    const [, field] = columnKey.split('.');
                    const isTextColumn = field === 'subject' || field === 'summary' || field === 'title' || field === 'description';
                    const cellClass = isTextColumn 
                      ? "px-4 py-2 align-middle max-w-xs group" 
                      : "px-4 py-2 whitespace-nowrap align-middle group";
                    
                    return (
                      <td key={columnKey} className={cellClass}>
                        {renderTableCell(cellRecord, columnKey)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium align-middle">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer" title="Open in source system">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800 transition-colors duration-200 cursor-pointer" title="Configure record">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={getVisibleColumnsInOrder().length + 2} className="px-4 py-3 text-sm text-gray-700 font-medium">
                  Total: {linkedRecords.length} record{linkedRecords.length !== 1 ? 's' : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {linkedRecords.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No records found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default RecordTable;