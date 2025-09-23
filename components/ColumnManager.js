import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Edit3 
} from 'lucide-react';
import CustomColumnForm from './CustomColumnForm';

const ColumnManager = ({
  // Modal state
  showColumnConfig,
  setShowColumnConfig,
  showAddColumn,
  setShowAddColumn,
  showCustomColumnForm,
  setShowCustomColumnForm,
  
  // Column data
  currentColumnMetadata,
  visibleColumns,
  columnOrder,
  columnDisplayNames,
  
  // Column functions
  getVisibleColumnsInOrder,
  getAvailableColumns,
  addColumn,
  removeColumn,
  moveColumn,
  
  // Drag and drop state
  draggedColumn,
  setDraggedColumn,
  dragOverIndex,
  setDragOverIndex,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
  
  // System expansion
  expandedSystems,
  toggleSystemExpansion,
  
  // Custom columns
  customColumns,
  editingColumn,
  setEditingColumn,
  handleSaveCustomColumn,
  handleEditCustomColumn,
  handleDeleteCustomColumn,
  
  // Display name editing
  editingDisplayName,
  setEditingDisplayName,
  displayNameInput,
  setDisplayNameInput,
  startEditingDisplayName,
  saveDisplayName,
  cancelDisplayNameEdit
}) => {
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

  return (
    <>
      {/* Column Configuration Modal */}
      {showColumnConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Configure Columns</h3>
              <button
                onClick={() => setShowColumnConfig(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <p className="text-base text-gray-800">
                  Manage your active columns and their order:
                </p>
                <button
                  onClick={() => setShowAddColumn(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Column
                </button>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <GripVertical className="w-5 h-5" />
                  Active Columns ({getVisibleColumnsInOrder().length})
                </h4>
                <p className="text-sm text-gray-600 mb-6">
                  Drag items to reorder columns, or use the arrow buttons. Click the X to remove columns.
                </p>
                
                {getVisibleColumnsInOrder().length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No active columns</p>
                    <p className="text-sm mt-2">Click &quot;Add Column&quot; to get started</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {getVisibleColumnsInOrder().map((columnKey, index) => {
                      const meta = currentColumnMetadata[columnKey];
                      
                      // Skip if metadata doesn't exist for this column
                      if (!meta) {
                        console.warn(`No metadata found for column: ${columnKey}`);
                        return null;
                      }
                      
                      const isDragging = draggedColumn === columnKey;
                      const isDragOver = dragOverIndex === index;
                      
                      return (
                        <div
                          key={columnKey}
                          draggable
                          onDragStart={(e) => handleDragStart(e, columnKey)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-move ${
                            isDragging 
                              ? 'bg-blue-100 border-blue-300 opacity-50 scale-105' 
                              : isDragOver
                              ? 'bg-green-100 border-green-300 border-dashed'
                              : 'bg-gray-100 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveColumn(columnKey, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveColumn(columnKey, 'down')}
                              disabled={index === getVisibleColumnsInOrder().length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${getColorClass(meta.color || 'gray')}`}>
                              {meta.label}
                            </span>
                            <div className="text-xs text-gray-500 capitalize">
                              {meta.group}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 font-mono bg-gray-200 px-2 py-1 rounded">
                            #{index + 1}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditingDisplayName(columnKey, meta.label)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit display name"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeColumn(columnKey)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove column"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Display Name Editing */}
            {editingDisplayName && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-3">Edit Display Name</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveDisplayName();
                      if (e.key === 'Escape') cancelDisplayNameEdit();
                    }}
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter display name"
                    autoFocus
                  />
                  <button
                    onClick={saveDisplayName}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelDisplayNameEdit}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  This will change how the column appears in the table header.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowColumnConfig(false)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {showCustomColumnForm ? 'Create Custom Column' : 'Add Column'}
              </h3>
              <button
                onClick={() => {
                  setShowAddColumn(false);
                  setShowCustomColumnForm(false);
                  setEditingColumn(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {showCustomColumnForm ? (
              <CustomColumnForm 
                onSave={handleSaveCustomColumn}
                onCancel={() => setShowCustomColumnForm(false)}
                existingColumn={editingColumn}
              />
            ) : (
              <div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <p className="text-sm text-gray-800 mb-4">
                    Select a column to add to your table:
                  </p>
                  
                  {getAvailableColumns().length === 0 && customColumns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">All columns are already active</p>
                      <p className="text-xs mt-1">Remove columns from the main view to add different ones</p>
                    </div>
                  ) : (
                    <>
                      {/* Custom Columns Section */}
                      <div className="space-y-3">
                        <button
                          onClick={() => toggleSystemExpansion('custom')}
                          className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-indigo-800">Custom Columns</h4>
                            <span className="text-xs text-indigo-600 bg-indigo-200 px-2 py-0.5 rounded-full">
                              {getAvailableColumns().filter(key => key.startsWith('custom.')).length}
                            </span>
                          </div>
                          {expandedSystems.custom ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-indigo-600" />
                          )}
                        </button>
                        
                        {expandedSystems.custom && (
                          <div className="space-y-2 ml-4">
                            {/* Existing custom columns that can be added */}
                            {getAvailableColumns()
                              .filter(key => key.startsWith('custom.'))
                              .map(columnKey => {
                                const meta = currentColumnMetadata[columnKey];
                                return (
                                  <button
                                    key={columnKey}
                                    onClick={() => addColumn(columnKey)}
                                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-indigo-50 rounded-lg border border-indigo-100 transition-colors text-left"
                                  >
                                    <div>
                                      <span className="text-sm font-medium text-indigo-700">
                                        {meta.label}
                                      </span>
                                      <div className="text-xs text-indigo-600 capitalize">
                                        {meta.type} • {meta.group}
                                      </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-indigo-600" />
                                  </button>
                                );
                              })}
                            
                            {/* Create new custom column button */}
                            <button
                              onClick={() => setShowCustomColumnForm(true)}
                              className="w-full flex items-center justify-between p-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg border border-indigo-600 transition-colors text-left"
                            >
                              <div>
                                <span className="text-sm font-medium text-white">
                                  Create New Custom Column
                                </span>
                                <div className="text-xs text-indigo-200">
                                  Add a new custom field to your records
                                </div>
                              </div>
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* System Columns Sections */}
                      {['zendesk', 'jira', 'slack', 'github', 'salesforce', 'teams'].map(system => {
                        const systemColors = {
                          zendesk: { bg: 'green', text: 'green' },
                          jira: { bg: 'blue', text: 'blue' },
                          slack: { bg: 'red', text: 'red' },
                          github: { bg: 'gray', text: 'gray' },
                          salesforce: { bg: 'blue', text: 'blue' },
                          teams: { bg: 'purple', text: 'purple' }
                        };
                        
                        const colors = systemColors[system];
                        
                        return (
                          <div key={system} className="space-y-3">
                            <button
                              onClick={() => toggleSystemExpansion(system)}
                              className={`w-full flex items-center justify-between p-3 bg-${colors.bg}-50 hover:bg-${colors.bg}-100 rounded-lg border border-${colors.bg}-200 transition-colors`}
                            >
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-medium text-${colors.text}-800`}>
                                  Available {system.charAt(0).toUpperCase() + system.slice(1)} Fields
                                </h4>
                                <span className={`text-xs text-${colors.text}-600 bg-${colors.text}-200 px-2 py-0.5 rounded-full`}>
                                  {getAvailableColumns().filter(key => key.startsWith(`${system}.`)).length}
                                </span>
                              </div>
                              {expandedSystems[system] ? (
                                <ChevronUp className={`w-4 h-4 text-${colors.text}-600`} />
                              ) : (
                                <ChevronDown className={`w-4 h-4 text-${colors.text}-600`} />
                              )}
                            </button>
                            
                            {expandedSystems[system] && (
                              <div className="space-y-2 ml-4">
                                {getAvailableColumns()
                                  .filter(key => key.startsWith(`${system}.`))
                                  .map(columnKey => {
                                    const meta = currentColumnMetadata[columnKey];
                                    return (
                                      <div key={columnKey} className="flex items-center gap-2">
                                        <button
                                          onClick={() => addColumn(columnKey)}
                                          className={`flex-1 flex items-center justify-between p-3 bg-white hover:bg-${colors.bg}-50 rounded-lg border border-${colors.bg}-100 transition-colors text-left`}
                                        >
                                          <div>
                                            <span className={`text-sm font-medium text-${colors.text}-700`}>
                                              {meta.label}
                                            </span>
                                            <div className={`text-xs text-${colors.text}-600 capitalize`}>
                                              {meta.group}
                                            </div>
                                          </div>
                                          <Plus className={`w-4 h-4 text-${colors.text}-600`} />
                                        </button>
                                        <button
                                          onClick={() => startEditingDisplayName(columnKey, meta.label)}
                                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                          title="Edit display name"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
                
                {/* Display Name Editing */}
                {editingDisplayName && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">Edit Display Name</h4>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveDisplayName();
                          if (e.key === 'Escape') cancelDisplayNameEdit();
                        }}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Enter display name"
                        autoFocus
                      />
                      <button
                        onClick={saveDisplayName}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelDisplayNameEdit}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      This will change how the column appears in the table header.
                    </p>
                  </div>
                )}
                
                {!showCustomColumnForm && !editingDisplayName && (
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowAddColumn(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ColumnManager;